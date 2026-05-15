const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
const TARGET_URL = 'https://poxel.io';

app.get('*', async (req, res) => {
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            executablePath: '/usr/bin/google-chrome', // Ruta estándar en la imagen de Docker
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.goto(TARGET_URL + req.url, { waitUntil: 'networkidle2', timeout: 60000 });

        const content = await page.content();
        await browser.close();
        res.send(content);
    } catch (error) {
        if (browser) await browser.close();
        res.status(500).send("Error: " + error.message);
    }
});

app.listen(process.env.PORT || 10000);
