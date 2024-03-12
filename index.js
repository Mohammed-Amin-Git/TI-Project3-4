import { ReadlineParser } from '@serialport/parser-readline';
import { createTunnel } from 'tunnel-ssh';
import { SerialPort } from 'serialport';
import { WebSocketServer } from 'ws';
import mysql from 'mysql2/promise';
import express from 'express';
import 'dotenv/config';

const app = express();
const wss = new WebSocketServer({ port: 8080 });

app.use(express.static('public'));

const port = new SerialPort({ path: process.env.SERIAL_PORT, baudRate: 9600 });
const parser = port.pipe(new ReadlineParser());

const tunnelOptions = {
  autoClose:true
}

const serverOptions = {
  port: process.env.DB_PORT
}

const sshOptions = {
  host: process.env.DB_SSH_HOST,
  port: 22,
  username: process.env.DB_SSH_USER,
  password: process.env.DB_SSH_PASSWORD
}

const forwardOptions = {
  srcAddr: '127.0.0.1',
  srcPort: process.env.DB_SSH_PORT,
  dstAddr: '127.0.0.1',
  dstPort: process.env.DB_SSH_PORT
}

let [server, conn] = await createTunnel(tunnelOptions, serverOptions, sshOptions, forwardOptions);

server.on('connection', (connection) => {
  console.log("SSH Tunnel succesful");
});

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

// BEGIN TESTING: MySQL data retrieval

// db.query("SELECT * FROM accounts").then(([rows, fields]) => {
//   console.log(rows);
// })

(async () => {
  let data = await db.query("SELECT * FROM accounts");
  console.log(data[0]); 
})();

// END TESTING

// States: NULL, SCAN_CARD, PINCODE, OPTIONS
let CLIENT_STATE = "NULL";

wss.on('connection', ws => {
    console.log("Client connection established!");
    CLIENT_STATE = "SCAN_CARD";
    let pincode_count = 0;

    parser.on('data', (data) => {
      try {
        // Parsing incoming pincode data
        let dataObj = JSON.parse(data);

        String.fromCharCode(dataObj.data)

        switch(dataObj.type) {
          case "PINCODE":
              if(CLIENT_STATE == "PINCODE") {
                  console.log(dataObj);
                  // Sending pincode number to client
                  ws.send(JSON.stringify({
                      "type": "PINCODE",
                      "data": "*"
                  }));

                  pincode_count++;
                  if(pincode_count >= 4) {
                    CLIENT_STATE = "OPTIONS";
                    pincode_count = 0;

                    ws.send(JSON.stringify({
                      "type": "REDIRECT",
                      "data": "OPTIONS"
                    }));
                  } 
              }
              break;
          }
      } catch(err) {
        let uid = data.trim();
        console.log(uid);
        // Sending redirect
        ws.send(JSON.stringify({
          "type": "REDIRECT",
          "data": "PINCODE"
        }));
        CLIENT_STATE = "PINCODE";
      }
    });
});

app.listen(80, () => console.log("Creating Server: http://localhost/"));