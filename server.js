const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let usuariosActivos = {};

io.on('connection', (socket) => {
    const usuarioId = socket.id;
    // Captura el nombre enviado desde el cliente, si no hay, pone uno por defecto
    const nombreUsuario = socket.handshake.query.nombre || "InvitadoAnónimo";
    const ipUsuario = socket.handshake.address === '::1' ? '127.0.0.1' : socket.handshake.address;

    usuariosActivos[usuarioId] = {
        id: usuarioId,
        nombre: nombreUsuario,
        ip: ipUsuario
    };

    console.log(`🟢 ${nombreUsuario} se ha conectado.`);
    io.emit('actualizar_usuarios', Object.values(usuariosActivos));

    socket.on('solicitar_lista', () => {
        socket.emit('actualizar_usuarios', Object.values(usuariosActivos));
    });

    socket.on('expulsar_usuario', (idAExpulsar) => {
        if (usuariosActivos[idAExpulsar]) {
            console.log(`❌ Expulsando individualmente a: ${usuariosActivos[idAExpulsar].nombre}`);
            io.to(idAExpulsar).emit('orden_expulsion');
        }
    });

    socket.on('cerrar_web_global', () => {
        console.log(`🚨 EL ADMINISTRADOR HA CERRADO LA WEB PARA TODOS.`);
        socket.broadcast.emit('orden_expulsion');
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


