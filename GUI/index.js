import { WebSocketServer } from 'ws';
import express, { json } from 'express';
import 'dotenv/config';
import { handleWebSocketConnection } from './handleWebSocketConnection.js';

const app = express();
const wss = new WebSocketServer({ port: 8080 });

// Express
app.use(express.static('public'));
app.use(express.json());

// BEGIN TESTING: MySQL data retrieval

// db.query("SELECT * FROM Customer").then(([rows, fields]) => {
//   console.log(rows);
// })

// (async () => {
//   let data = await db.query("SELECT * FROM accounts");
//   console.log(data[0]); 
// })();

// END TESTING

// States: NULL, SCAN_CARD, PINCODE, OPTIONS

// WebSockets
wss.on('connection', ws => {
    handleWebSocketConnection(ws);
});

app.listen(80, () => console.log("Creating Server: http://localhost/"));