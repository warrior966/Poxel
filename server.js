const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    maxHttpBufferSize: 1e7 // Permite transferencia de imágenes pesadas (capturas de pantalla)
});

const PORT = process.env.PORT || 3000;
const ADMIN_TRIGGER_URL = "https://tu-url-secreta-admin.com";

// Estado en memoria (Optimizado para Render Gratis)
let globalWebBlocked = false;
let users = {}; // Guarda { socketId: { nickname, url, blocked, role } }

app.use(express.static(path.join(__dirname, 'public')));

// PROXY PARA EVITAR CONFIGURACIONES DE IFRAME (X-Frame-Options)
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("Falta la URL");

    try {
        const response = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            responseType: 'text'
        });
        
        // Eliminamos cabeceras restrictivas y modificamos enlaces relativos básicos
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.send(response.data);
    } catch (error) {
        res.status(500).send("Error al cargar la web mediante el proxy: " + error.message);
    }
});

// Lógica de Sockets (Tiempo real)
io.on('connection', (socket) => {
    
    // Al registrarse un usuario
    socket.on('register', ({ nickname, url }) => {
        const isAdmin = (url === ADMIN_TRIGGER_URL);
        
        users[socket.id] = {
            id: socket.id,
            nickname: nickname,
            url: url,
            blocked: false,
            role: isAdmin ? 'admin' : 'user'
        };

        if (isAdmin) {
            socket.emit('admin-granted', { globalWebBlocked, users: Object.values(users) });
        } else {
            // Si la web está bloqueada globalmente o el usuario estaba bloqueado
            if (globalWebBlocked) {
                socket.emit('force-block', 'La web está bloqueada globalmente por el administrador.');
            }
        }
        // Avisar a los admins del nuevo usuario
        io.emit('update-users', Object.values(users));
    });

    // Acción Admin: Bloqueo Global
    socket.on('toggle-global-block', (status) => {
        if (users[socket.id]?.role !== 'admin') return;
        globalWebBlocked = status;
        if (globalWebBlocked) {
            socket.broadcast.emit('force-block', 'La web ha sido bloqueada globalmente.');
        } else {
            socket.broadcast.emit('force-unblock');
        }
    });

    // Acción Admin: Bloquear/Desbloquear Usuario específico
    socket.on('toggle-user-block', ({ targetId, blockStatus }) => {
        if (users[socket.id]?.role !== 'admin') return;
        if (users[targetId]) {
            users[targetId].blocked = blockStatus;
            if (blockStatus) {
                io.to(targetId).emit('force-block', 'Has sido bloqueado por el administrador.');
            } else {
                io.to(targetId).emit('force-unblock');
            }
            io.emit('update-users', Object.values(users));
        }
    });

    // Retransmisión de pantalla (Stream) del Usuario al Admin
    socket.on('screen-share', ({ adminId, image }) => {
        io.to(adminId).emit('screen-stream', image);
    });

    // Admin solicita ver pantalla
    socket.on('request-screen', (targetId) => {
        if (users[socket.id]?.role !== 'admin') return;
        io.to(targetId).emit('start-screen-share', socket.id);
    });

    // Desconexión
    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('update-users', Object.values(users));
    });
});

server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
