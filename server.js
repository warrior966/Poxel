const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { execSync } = require('child_process');
const path = require('path');

puppeteer.use(StealthPlugin());

const app = express();
const TARGET_URL = 'https://poxel.io';

// Buscamos el ejecutable en la carpeta local del proyecto
function getLocalChromePath() {
    try {
        const localPath = execSync(`find ${path.join(__dirname, 'chrome')} -name chrome -type f | head -n 1`).toString().trim();
        return localPath || null;
    } catch (e) {
        return null;
    }
}

app.get('*', async (req, res) => {
    let browser = null;
    try {
        const chromePath = getLocalChromePath();
        console.log(`Intentando iniciar Chrome en: ${chromePath}`);

        if (!chromePath) throw new Error("No se encontró el ejecutable de Chrome en ./chrome");

        browser = await puppeteer.launch({
            headless: "new",
            executablePath: chromePath,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Ir a Poxel
        await page.goto(TARGET_URL + req.url, { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        const content = await page.content();
        await browser.close();
        res.send(content);

    } catch (error) {
        console.error("Error crítico:", error.message);
        if (browser) await browser.close();
        res.status(500).send(`Error: ${error.message}. Revisa los logs de Render.`);
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor listo en puerto ${PORT}`));
