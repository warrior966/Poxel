const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { execSync } = require('child_process');

puppeteer.use(StealthPlugin());

const app = express();
const TARGET_URL = 'https://poxel.io';

// Función para encontrar la ruta de Chrome dinámicamente en Render
function getChromePath() {
    try {
        const path = execSync('find /opt/render/.cache/puppeteer -name chrome -type f | head -n 1').toString().trim();
        return path || null;
    } catch (e) {
        return null;
    }
}

app.get('*', async (req, res) => {
    let browser = null;
    try {
        const chromePath = getChromePath();
        console.log(`Usando Chrome en: ${chromePath}`);

        browser = await puppeteer.launch({
            headless: "new",
            executablePath: chromePath, // Detectado automáticamente
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        
        // Bloqueo selectivo para no saturar la RAM de 512MB de Render
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Navegación a Poxel
        await page.goto(TARGET_URL + req.url, { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        const content = await page.content();
        await browser.close();
        
        res.send(content);

    } catch (error) {
        console.error("Error:", error.message);
        if (browser) await browser.close();
        res.status(500).send(`
            <h1>Error de conexión</h1>
            <p>${error.message}</p>
            <small>Si el error persiste, limpia la caché en Render y despliega de nuevo.</small>
        `);
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Proxy corriendo en puerto ${PORT}`);
});
