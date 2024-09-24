const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
const Transaction = require("../Models/Transaction");

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
  paymentStaffData
) => {
  try {
    const invoiceNumber = await generateInvoiceNumber();
    const templatePath = path.join(__dirname, "..", "views", "invoice.ejs");
    const templateContent = fs.readFileSync(templatePath, "utf8");
    const renderedTemplate = ejs.render(templateContent, {
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

    await page.setContent(renderedTemplate, { waitUntil: "networkidle0" });
    await page.setViewport({ width: 2480, height: 3508 });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      scale: 0.35,
    });

    await browser.close();

    const currentDateTime = new Date().toISOString().replace(/[:.]/g, "-");
    const pdfFilePath = path.join(
      __dirname,
      "..",
      "uploads",
      "invoices",
      `${currentDateTime}_invoice.pdf`
    );

    ensureDirectoryExistence(pdfFilePath);

    fs.writeFileSync(pdfFilePath, pdfBuffer);
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

module.exports = {
  generateInvoice,
};
