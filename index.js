import { ReadlineParser } from '@serialport/parser-readline';
import { SerialPort } from 'serialport';
import { WebSocketServer } from 'ws';
import express from 'express';

const app = express();
const wss = new WebSocketServer({ port: 8080 });

app.use(express.static('public'));

const port = new SerialPort({ path: "COM5", baudRate: 9600 });
const parser = port.pipe(new ReadlineParser());

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