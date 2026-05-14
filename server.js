const express = require('express');
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const { translate } = require('@vitalets/google-translate-api'); // Requiere: npm install @vitalets/google-translate-api

const app = express();
const TARGET_URL = 'https://poxel.io'; // La web del juego original

// Función auxiliar para traducir textos dinámicos en archivos JSON o configuraciones
async function translateJSONContent(jsonBuffer) {
    try {
        const data = JSON.parse(jsonBuffer.toString('utf8'));
        
        // Función recursiva para buscar y traducir strings dentro del JSON del juego
        async function translateObject(obj) {
            for (let key in obj) {
                if (typeof obj[key] === 'string' && obj[key].length > 0) {
                    try {
                        const res = await translate(obj[key], { to: 'es' });
                        obj[key] = res.text;
                    } catch (e) {
                        // Si falla una palabra, mantiene la original para no romper el juego
                    }
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    await translateObject(obj[key]);
                }
            }
        }
        
        await translateObject(data);
        return Buffer.from(JSON.stringify(data));
    } catch (err) {
        return jsonBuffer; // Si no es un JSON válido, devuelve el archivo sin alterar
    }
}

// Configuración del proxy interceptor
app.use('/', createProxyMiddleware({
    target: TARGET_URL,
    changeOrigin: true,
    selfHandleResponse: true, // Permite modificar la respuesta antes de enviarla al usuario
    onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
        const contentType = proxyRes.headers['content-type'] || '';

        // 1. Interceptar archivos de traducción o configuración (.json)
        if (contentType.includes('application/json') || req.url.includes('lang') || req.url.includes('locale')) {
            return await translateJSONContent(responseBuffer);
        }

        // 2. Interceptar el HTML principal para modificar títulos o textos básicos de carga
        if (contentType.includes('text/html')) {
            let html = responseBuffer.toString('utf8');
            
            // Ejemplo: Traduce el título de la pestaña del navegador
            html = html.replace('<title>Poxel.io | FPS io Game</title>', '<title>Poxel.io en Español | Juego FPS Gratis</title>');
            
            return Buffer.from(html);
        }

        // 3. Devolver archivos multimedia, scripts de texturas y WebGL sin cambios
        return responseBuffer;
    }),
    onError: (err, req, res) => {
        res.status(500).send('Error de conexión con los servidores del juego.');
    }
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de traducción corriendo en http://localhost:${PORT}`);
});

