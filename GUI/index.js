// Custom modules
import { handleWebSocketConnection } from './modules/handleWebSocketConnection.js';

// NPM modules
import express, { json } from 'express';
import { WebSocketServer } from 'ws';
import 'dotenv/config';

const app = express();
const wss = new WebSocketServer({ port: process.env.WEB_SOCKET_PORT });

// Express
app.use(express.static('public'));
app.use(express.json());

// WebSockets
wss.on('connection', ws => {
    handleWebSocketConnection(ws);
});

app.listen(process.env.PORT, () => console.log("Creating Server: http://localhost/"));