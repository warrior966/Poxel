const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();

app.get('*', async (req, res) => {
    try {
        const browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Imitamos resolución y lenguaje de un usuario real
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Vamos a poxel.io
        await page.goto('https://poxel.io' + req.url, { waitUntil: 'networkidle2' });

        // Extraemos el contenido ya renderizado (después de pasar Cloudflare)
        const content = await page.content();
        
        await browser.close();
        res.send(content);
    } catch (e) {
        res.status(500).send("Error intentando burlar el muro: " + e.message);
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Navegador fantasma activo en puerto ${PORT}`));
