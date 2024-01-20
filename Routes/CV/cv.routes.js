require("dotenv").config();
const express = require('express');
const Maid = require("../../Models/Maid")
const router = express.Router();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const ejs = require("ejs")



router.get("/:userId", async (req, res) =>{
    const maidId = req.params.userId;
    try {
        const findMaid = await Maid.findOne({ _id: maidId });

        if (!findMaid) {
            return res.status(404).send('No maid found with that ID');
        }
        res.render("cv", { maidData: findMaid })
    } catch (error) {
        
    }
})


router.get('/pdf/:userId', async (req, res) => {
    const maidId = req.params.userId;

    try {
        const findMaid = await Maid.findOne({ _id: maidId });

        if (!findMaid) {
            return res.status(404).send('No maid found with that ID');
        }

        const browser = await puppeteer.launch({headless:"new", args:['--no-sandbox']});
        const page = await browser.newPage();
        
        await page.goto(`${process.env.CURRENT_URL}cv/${maidId}`,{
            waitUntil:"networkidle2"
        })
        await page.setViewport({ width: 2480, height: 3508 });

        const templatePath = path.join(__dirname, '..','..', 'views', 'cv.ejs');
        const templateContent = fs.readFileSync(templatePath, 'utf8');

        const renderedTemplate = ejs.render(templateContent, { maidData: findMaid });

        await page.setContent(renderedTemplate);
        await page.emulateMediaType('screen');
        await page.evaluateHandle('document.fonts.ready');

        const pdfOptions = {
            printBackground: true,
            format: 'A4',
            scale: .35
        };

        const pdfBuffer = await page.pdf(pdfOptions);

        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${findMaid.name}_cv.pdf`);
        res.send(pdfBuffer);
    } catch (err) {
        console.log(err);
        res.status(500).send('Server error: ' + err.message);
    }
});

module.exports = router;