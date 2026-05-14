const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const TARGET_URL = 'https://poxel.io';

app.use('/', createProxyMiddleware({
    target: TARGET_URL,
    changeOrigin: true,
    secure: true,
    // Forzamos las cabeceras para evitar bloqueos por seguridad (CORS/Referer)
    onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('referer', TARGET_URL);
        proxyReq.setHeader('origin', TARGET_URL);
    },
    // Esto ayuda a que los enlaces internos funcionen mejor
    cookieDomainRewrite: "", 
    logLevel: 'debug'
}));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Proxy activo para poxel.io en el puerto ${PORT}`);
});
