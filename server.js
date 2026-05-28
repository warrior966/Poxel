const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    maxHttpBufferSize: 1e7 // Capacidad para las capturas de pantalla
});

const PORT = process.env.PORT || 3000;
const ADMIN_TRIGGER_URL = "https://tu-url-secreta-admin.com";

let globalWebBlocked = false;
let users = {}; 

app.use(express.static(path.join(__dirname, 'public')));

// LÓGICA DE SOCKETS (Control de usuarios y administración)
io.on('connection', (socket) => {
    
    socket.on('register', ({ nickname, url }) => {
        // Corrección de URL interna
        let finalUrl = url.trim();
        if (!/^https?:\/\//i.test(finalUrl)) {
            finalUrl = 'https://' + finalUrl;
        }

        const isAdmin = (finalUrl === ADMIN_TRIGGER_URL);
        
        users[socket.id] = {
            id: socket.id,
            nickname: nickname,
            url: finalUrl,
            blocked: false,
            role: isAdmin ? 'admin' : 'user'
        };

        if (isAdmin) {
            socket.emit('admin-granted', { globalWebBlocked, users: Object.values(users) });
        } else if (globalWebBlocked) {
            socket.emit('force-block', 'La web está bloqueada globalmente por el administrador.');
        }
        
        io.emit('update-users', Object.values(users));
    });

    socket.on('toggle-global-block', (status) => {
        if (users[socket.id]?.role !== 'admin') return;
        globalWebBlocked = status;
        if (globalWebBlocked) {
            socket.broadcast.emit('force-block', 'La web ha sido bloqueada globalmente.');
        } else {
            socket.broadcast.emit('force-unblock');
        }
    });

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

    socket.on('screen-share', ({ adminId, image }) => {
        io.to(adminId).emit('screen-stream', image);
    });

    socket.on('request-screen', (targetId) => {
        if (users[socket.id]?.role !== 'admin') return;
        io.to(targetId).emit('start-screen-share', socket.id);
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('update-users', Object.values(users));
    });
});

server.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
