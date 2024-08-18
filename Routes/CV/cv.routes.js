require("dotenv").config();
const express = require("express");
const Maid = require("../../Models/Maid");
const router = express.Router();
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
const translate = require("@iamtraction/google-translate");

router.get("/:userId", async (req, res) => {
  const maidId = req.params.userId;
  try {
    const findMaid = await Maid.findOne({ _id: maidId });

    if (!findMaid) {
      return res.status(404).send("No maid found with that ID");
    }

    const fieldsToTranslate = [
      "name",
      "nationality",
      "salery",
      "religion",
      "maritalStatus",
      "childrens",
      "age",
      "education",
      "languages",
      "contractPeriod",
      "remarks",
      "appliedFor",
      "experience",
    ];

    const arabicMaidData = {};

    await Promise.all(
      fieldsToTranslate.map(async (field) => {
        const value = findMaid[field];
        try {
          if (typeof value === "string") {
            const translation = await translate(value, {
              from: "en",
              to: "ar",
            });
            arabicMaidData[field] = translation.text;
          } else if (Array.isArray(value)) {
            arabicMaidData[field] = await Promise.all(
              value.map(async (item) => {
                const translation = await translate(item, {
                  from: "en",
                  to: "ar",
                });
                return translation.text;
              })
            );
          } else {
            arabicMaidData[field] = value.toString();
          }
        } catch (err) {
          console.error(`Error translating field "${field}":`, err);
          arabicMaidData[field] = value.toString();
        }
      })
    );
    console.log(arabicMaidData);

    res.render("cv", { maidData: findMaid, arabicMaidData: arabicMaidData });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send("Server error: " + err.message);
  }
});

router.get("/pdf/:userId", async (req, res) => {
  const maidId = req.params.userId;

  try {
    const findMaid = await Maid.findOne({ _id: maidId });

    if (!findMaid) {
      return res.status(404).send("No maid found with that ID");
    }

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();

    await page.goto(`${process.env.CURRENT_URL}cv/${maidId}`, {
      waitUntil: "networkidle2",
    });
    await page.setViewport({ width: 2480, height: 3508 });

    const templatePath = path.join(__dirname, "..", "..", "views", "cv.ejs");
    const templateContent = fs.readFileSync(templatePath, "utf8");
    
    const fieldsToTranslate = [
      "name",
      "nationality",
      "salery",
      "religion",
      "maritalStatus",
      "childrens",
      "age",
      "education",
      "languages",
      "contractPeriod",
      "remarks",
      "appliedFor",
      "experience",
    ];

    const arabicMaidData = {};

    await Promise.all(
      fieldsToTranslate.map(async (field) => {
        const value = findMaid[field];
        try {
          if (typeof value === "string") {
            const translation = await translate(value, {
              from: "en",
              to: "ar",
            });
            arabicMaidData[field] = translation.text;
          } else if (Array.isArray(value)) {
            arabicMaidData[field] = await Promise.all(
              value.map(async (item) => {
                const translation = await translate(item, {
                  from: "en",
                  to: "ar",
                });
                return translation.text;
              })
            );
          } else {
            arabicMaidData[field] = value.toString();
          }
        } catch (err) {
          console.error(`Error translating field "${field}":`, err);
          arabicMaidData[field] = value.toString();
        }
      })
    );
    const renderedTemplate = ejs.render(templateContent, {
      maidData: findMaid,
      arabicMaidData
    });

    await page.setContent(renderedTemplate);
    await page.emulateMediaType("screen");
    await page.evaluateHandle("document.fonts.ready");

    const pdfOptions = {
      printBackground: true,
      format: "A4",
      scale: 0.35,
    };

    const pdfBuffer = await page.pdf(pdfOptions);

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${findMaid.name}_cv.pdf`
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error: " + err.message);
  }
});

module.exports = router;
