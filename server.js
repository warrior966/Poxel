const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const TARGET_URL = 'https://poxel.io';

app.use('/', createProxyMiddleware({
    target: TARGET_URL,
    changeOrigin: true,
    ws: true, // Habilita WebSockets para juegos
    secure: true,
    onProxyReq: (proxyReq, req, res) => {
        // Imitamos a un navegador Chrome en Windows
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        proxyReq.setHeader('Accept-Language', 'es-ES,es;q=0.9');
        proxyReq.setHeader('referer', 'https://poxel.io/');
        proxyReq.setHeader('origin', 'https://poxel.io');
    },
    onError: (err, req, res) => {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error de conexión con Poxel. Es probable que Cloudflare esté bloqueando la IP del servidor.');
    }
}));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Proxy optimizado en puerto ${PORT}`);
});
