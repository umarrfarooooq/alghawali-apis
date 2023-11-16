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
        // await page.goto(`https://admin.panel.alghawalimanpower.com/cv/${maidId}`,{
        //     waitUntil:"networkidle2"
        // })
        await page.goto(`http://localhost:5000/cv/${maidId}`,{
            waitUntil:"networkidle2"
        })
        await page.setViewport({ width: 1122, height: 793 });

        const templatePath = path.join(__dirname, '..','..', 'views', 'cv.ejs');
        const templateContent = fs.readFileSync(templatePath, 'utf8');

        const renderedTemplate = ejs.render(templateContent, { maidData: findMaid });

        await page.setContent(renderedTemplate);
        await page.emulateMediaType('screen');
        await page.evaluateHandle('document.fonts.ready');

        
        // const cssFilePath = path.join(__dirname, '..', '..', 'public', 'assets', 'cv-css', 'font-awesome', 'css', 'all.min.css');
        // const cssFilePath2 = path.join(__dirname, '..', '..', 'public', 'assets', 'cv-css', 'bootstrap.min.css');
        // const cssFilePath3 = path.join(__dirname, '..', '..', 'public', 'assets', 'cv-css', 'aos.css');
        // const cssFilePath4 = path.join(__dirname, '..', '..', 'public', 'assets', 'cv-css', 'main.css');

        
        // await page.addStyleTag({ path: cssFilePath });
        // await page.addStyleTag({ path: cssFilePath2 });
        // await page.addStyleTag({ path: cssFilePath3 });
        // await page.addStyleTag({ path: cssFilePath4 });


        const pdfOptions = {
            printBackground: true,
            format: 'A4',
            width: '1122px',
        };

        const pdfBuffer = await page.pdf(pdfOptions);

        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=maid_${maidId}_cv.pdf`);
        res.send(pdfBuffer);
    } catch (err) {
        console.log(err);
        res.status(500).send('Server error: ' + err.message);
    }
});

module.exports = router;