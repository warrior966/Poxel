const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const ADMIN_NICKNAME_TRIGGER = "Admin0503"; 

let globalWebBlocked = false;
let users = {}; 

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    
    socket.on('register', ({ nickname, url }) => {
        let finalUrl = url.trim();
        if (!/^https?:\/\//i.test(finalUrl)) {
            finalUrl = 'https://' + finalUrl;
        }

        const isAdmin = (nickname.trim() === ADMIN_NICKNAME_TRIGGER);
        
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

    // NUEVO: Admin envía mensaje a un usuario específico
    socket.on('send-message', ({ targetId, message }) => {
        if (users[socket.id]?.role !== 'admin') return;
        io.to(targetId).emit('receive-message', { from: users[socket.id].nickname, fromId: socket.id, message });
    });

    // NUEVO: Usuario responde al Admin
    socket.on('reply-message', ({ adminId, message }) => {
        io.to(adminId).emit('receive-reply', { from: users[socket.id].nickname, fromId: socket.id, message });
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('update-users', Object.values(users));
    });
});

server.listen(PORT, () => {
    console.log(`Servidor listo en puerto ${PORT}`);
});
