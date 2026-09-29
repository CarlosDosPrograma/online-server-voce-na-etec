const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// Servir os arquivos estáticos (HTML, CSS, JS)
app.use(express.static(__dirname));

const players = {};

io.on('connection', (socket) => {
    console.log('Um jogador conectou: ' + socket.id);
    
    // Criar um novo jogador
    players[socket.id] = {
        x: 1600, // Centro aproximado do mapa (largura 3200)
        y: 1600,
        raio: 15,
        corCabeca: '#39ff6a' // Cor inicial padrão
    };

    // Enviar todos os jogadores atuais para o novo jogador
    socket.emit('currentPlayers', players);

    // Dizer aos outros jogadores que alguém conectou
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // Atualização de posição recebida de um jogador
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].corCabeca = movementData.corCabeca;
            // Repassar a nova posição para todos os outros
            socket.broadcast.emit('playerMoved', { id: socket.id, player: players[socket.id] });
        }
    });

    socket.on('disconnect', () => {
        console.log('Jogador desconectou: ' + socket.id);
        delete players[socket.id];
        // Avisar a todos que este jogador saiu
        io.emit('playerDisconnect', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando! Acesse http://localhost:${PORT}`);
});
