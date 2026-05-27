const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// ESTADO GLOBAL: Controla si la web está cerrada o abierta
let webBloqueada = false;
let usuariosActivos = {};

io.on('connection', (socket) => {
    const usuarioId = socket.id;
    const nombreUsuario = socket.handshake.query.nombre || "InvitadoAnónimo";
    const ipUsuario = socket.handshake.address === '::1' ? '127.0.0.1' : socket.handshake.address;

    // SI LA WEB ESTÁ BLOQUEADA: Expulsar inmediatamente a cualquier usuario no-admin
    if (webBloqueada && !nombreUsuario.includes("(Admin)")) {
        socket.emit('orden_expulsion');
        socket.disconnect();
        return;
    }

    usuariosActivos[usuarioId] = {
        id: usuarioId,
        nombre: nombreUsuario,
        ip: ipUsuario
    };

    console.log(`🟢 ${nombreUsuario} se ha conectado.`);
    io.emit('actualizar_usuarios', Object.values(usuariosActivos));

    // Si el usuario entra y la web ya estaba bloqueada, le mandamos el aviso
    if (webBloqueada) {
        socket.emit('orden_expulsion');
    }

    socket.on('solicitar_lista', () => {
        socket.emit('actualizar_usuarios', Object.values(usuariosActivos));
    });

    // 1. Expulsar a un usuario individual
    socket.on('expulsar_usuario', (idAExpulsar) => {
        if (usuariosActivos[idAExpulsar]) {
            console.log(`❌ Expulsando individualmente a: ${usuariosActivos[idAExpulsar].nombre}`);
            io.to(idAExpulsar).emit('orden_expulsion');
        }
    });

    // 2. Bloquear la web para TODOS de forma permanente
    socket.on('cerrar_web_global', () => {
        webBloqueada = true;
        console.log(`🚨 WEB BLOQUEADA POR EL ADMINISTRADOR.`);
        // Envía la orden a todos los que NO sean el admin actual
        socket.broadcast.emit('orden_expulsion');
    });

    // NUEVO: 3. Desbloquear la web y permitir accesos otra vez
    socket.on('abrir_web_global', () => {
        webBloqueada = false;
        console.log(`🔓 WEB DESBLOQUEADA POR EL ADMINISTRADOR.`);
        io.emit('orden_desbloqueo'); // Avisa a todos que pueden volver a usarla
    });

    socket.on('disconnect', () => {
        if (usuariosActivos[usuarioId]) {
            console.log(`🔴 ${usuariosActivos[usuarioId].nombre} se ha desconectado.`);
            delete usuariosActivos[usuarioId];
            io.emit('actualizar_usuarios', Object.values(usuariosActivos));
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor en ejecución en http://localhost:${PORT}`);
});


