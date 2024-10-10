const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const ejs = require("ejs");
const Transaction = require("../Models/Transaction");
const { PDFDocument } = require("pdf-lib");

const ensureDirectoryExistence = (filePath) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
};

const generateInvoiceNumber = async () => {
  const lastTransaction = await Transaction.findOne({
    "invoice.number": { $exists: true },
  })
    .sort({ "invoice.number": -1 })
    .exec();

  let newInvoiceNumber = "ALG000001";

  if (
    lastTransaction &&
    lastTransaction.invoice &&
    lastTransaction.invoice.number
  ) {
    const lastInvoiceNumber = lastTransaction.invoice.number;
    const lastNumber = parseInt(lastInvoiceNumber.replace("ALG", ""), 10);
    const incrementedNumber = lastNumber + 1;

    newInvoiceNumber = `ALG${incrementedNumber.toString().padStart(6, "0")}`;
  }

  return newInvoiceNumber;
};

const generateInvoice = async (
  invoiceType,
  maidData,
  customerData,
  transactionData,
  staffData,
  paymentStaffData,
  agencyType
) => {
  try {
    const invoiceNumber = await generateInvoiceNumber();
    const invoiceTemplatePath = path.join(
      __dirname,
      "..",
      "views",
      "invoice.ejs"
    );
    const invoiceTemplateContent = await fs.readFile(invoiceTemplatePath, {
      encoding: "utf8",
    });
    const renderedInvoiceTemplate = ejs.render(invoiceTemplateContent, {
      invoiceType,
      invoiceNumber,
      maidData,
      customerData,
      transactionData,
      staffData,
      paymentStaffData,
    });

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();

    await page.setContent(renderedInvoiceTemplate, {
      waitUntil: "networkidle0",
    });
    await page.setViewport({ width: 2480, height: 3508 });

    const invoicePdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      scale: 0.35,
    });

    let finalPdfBuffer = invoicePdfBuffer;

    if (invoiceType === "On Trial") {
      const trialPaperTemplatePath = getTrialPaperTemplatePath(
        maidData.nationality,
        agencyType
      );
      const trialPaperTemplateContent = await fs.readFile(
        trialPaperTemplatePath,
        {
          encoding: "utf8",
        }
      );
      const renderedTrialPaperTemplate = ejs.render(trialPaperTemplateContent, {
        sponserName: customerData.customerName,
        idCardNumber: customerData.idCardNumber,
        mobileNumber: customerData.phoneNo,
        profileName: maidData.name,
        passportNumber: maidData.passportNumber,
        price: customerData.totalAmount,
        salery: maidData.salary,
        amount: transactionData.amount,
        remainingAmount: customerData.totalAmount - transactionData.amount,
        date: transactionData.date,
      });

      await page.setContent(renderedTrialPaperTemplate, {
        waitUntil: "networkidle0",
      });
      const trialPaperPdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        scale: 0.35,
      });

      const termsConditionsPath = path.join(
        __dirname,
        "..",
        "public",
        "terms_and_conditions.pdf"
      );
      const termsConditionsPdfBuffer = await fs.readFile(termsConditionsPath);

      finalPdfBuffer = await mergePDFs(
        invoicePdfBuffer,
        trialPaperPdfBuffer,
        termsConditionsPdfBuffer
      );
    }

    await browser.close();

    const currentDateTime = new Date().toISOString().replace(/[:.]/g, "-");
    const pdfFilePath = path.join(
      __dirname,
      "..",
      "uploads",
      "invoices",
      `${currentDateTime}_invoice.pdf`
    );

    await fs.mkdir(path.dirname(pdfFilePath), { recursive: true });
    await fs.writeFile(pdfFilePath, finalPdfBuffer);

    const relativePdfFilePath = path.relative(
      path.join(__dirname, "..", "uploads"),
      pdfFilePath
    );

    return { invoiceNumber, pdfFilePath: relativePdfFilePath };
  } catch (error) {
    console.error("Error generating invoice:", error);
    throw new Error("Failed to generate invoice");
  }
};

const getTrialPaperTemplatePath = (country, agencyType) => {
  const baseDir = path.join(__dirname, "..", "views", "trial_papers");
  if (country.toLowerCase().includes("indonesia")) {
    return path.join(
      baseDir,
      `indonesia_${agencyType.toLowerCase()}_trial_paper.ejs`
    );
  }
  return path.join(baseDir, `${agencyType.toLowerCase()}_trial_paper.ejs`);
};

const mergePDFs = async (
  invoicePdfBuffer,
  trialPaperPdfBuffer,
  termsConditionsPdfBuffer
) => {
  const invoicePdf = await PDFDocument.load(invoicePdfBuffer);
  const trialPaperPdf = await PDFDocument.load(trialPaperPdfBuffer);
  const termsConditionsPdf = await PDFDocument.load(termsConditionsPdfBuffer);

  const mergedPdf = await PDFDocument.create();

  const copyPages = async (sourcePdf) => {
    const copiedPages = await mergedPdf.copyPages(
      sourcePdf,
      sourcePdf.getPageIndices()
    );
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  };

  await copyPages(invoicePdf);
  await copyPages(trialPaperPdf);
  await copyPages(termsConditionsPdf);

  return await mergedPdf.save();
};

module.exports = {
  generateInvoice,
};
