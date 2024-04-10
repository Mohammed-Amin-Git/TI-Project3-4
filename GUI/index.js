import { handleWebSocketConnection } from './handleWebSocketConnection.js';
import express, { json } from 'express';
import { WebSocketServer } from 'ws';
import 'dotenv/config';

const app = express();
const wss = new WebSocketServer({ port: 8080 });

// Express
app.use(express.static('public'));
app.use(express.json());

// WebSockets
wss.on('connection', ws => {
    handleWebSocketConnection(ws);
});

app.listen(80, () => console.log("Creating Server: http://localhost/"));