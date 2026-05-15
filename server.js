const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Activamos el modo sigilo para saltar detecciones básicas
puppeteer.use(StealthPlugin());

const app = express();
const TARGET_URL = 'https://poxel.io';

app.get('*', async (req, res) => {
    let browser = null;
    try {
        console.log(`Solicitando: ${req.url}`);
        
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Crítico para Render (evita crashes)
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process' // Ahorra mucha memoria RAM
            ]
        });

        const page = await browser.newPage();
        
        // Bloqueamos imágenes y fuentes para ahorrar RAM y cargar más rápido
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Intentamos cargar Poxel
        await page.goto(TARGET_URL + req.url, { 
            waitUntil: 'networkidle2', 
            timeout: 30000 
        });

        const content = await page.content();
        
        await browser.close();
        res.send(content);

    } catch (error) {
        console.error("Error en el servidor:", error.message);
        if (browser) await browser.close();
        res.status(500).send("Error cargando Poxel: " + error.message);
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor iniciado en puerto ${PORT}`);
});
