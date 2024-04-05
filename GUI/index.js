import { ReadlineParser } from '@serialport/parser-readline';
import { createTunnel } from 'tunnel-ssh';
import { SerialPort } from 'serialport';
import { WebSocketServer } from 'ws';
import mysql from 'mysql2/promise';
import express from 'express';
import 'dotenv/config';
import { findCashCombinations } from './cashCombination.js';

const app = express();
const wss = new WebSocketServer({ port: 8080 });

// Express
app.use(express.static('public'));
app.use(express.json());

// SerialPort Config
const port = new SerialPort({ path: process.env.SERIAL_PORT, baudRate: 9600 });
const parser = port.pipe(new ReadlineParser());

// SSH Tunnel Config
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
  console.log("SSH Tunnel succesfully connected!");
});

// MySQL Config
const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

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
let CLIENT_STATE = "NULL";

// WebSockets
wss.on('connection', ws => {
    console.log("Client connection established!");
    CLIENT_STATE = "SCAN_CARD";

    const bills = [5, 10, 50];

    let global_uid;
    let user_id;

    let pincode_count = 0;
    let pincode_error_count = 0;
    let pincode_input = "";

    let cash_input = "";
    let cash_count = 0;

    // Incoming Serial data
    parser.on('data', (data) => {
      try {
        // Parsing incoming pincode data
        let dataObj = JSON.parse(data);

        switch(dataObj.type) {
          case "KEYPAD":
              let pincodeCharacter = String.fromCharCode(dataObj.data);
              if(CLIENT_STATE == "PINCODE") {
                  console.log(dataObj);

                  if(pincodeCharacter == "#") {
                    ws.send(JSON.stringify({
                      "type": "PINCODE",
                      "data": "#"
                    }));

                    if(pincode_count > 0) {
                      pincode_count--;
                      pincode_input = pincode_input.substring(0, pincode_input.length-1);
                    }
                  } else if(pincodeCharacter != "*") {
                    // Sending pincode number to client
                    ws.send(JSON.stringify({
                      "type": "PINCODE",
                      "data": "*"
                    }));
                    pincode_count++;
                    pincode_input += pincodeCharacter;
                  }
                  if(pincode_count >= 4) {
                    CLIENT_STATE = "OPTIONS";
                    pincode_count = 0;

                    db.query("SELECT Customer_ID, Pincode, Card_blocked FROM Customer WHERE Pass_number = ? AND Pincode = ?", [global_uid, parseInt(pincode_input)])
                    .then(([rows, fields]) => {
                        if(rows.length == 0) {
                          pincode_error_count++;
                          CLIENT_STATE = "PINCODE";

                          ws.send(JSON.stringify({
                            "type": "ERROR",
                            "data": "PINCODE_INCORRECT",
                            "count": 3-pincode_error_count
                          }));

                          if(pincode_error_count >= 3) {
                            db.query("UPDATE Customer SET Card_blocked = TRUE WHERE Pass_number = ?", [global_uid]);

                            ws.send(JSON.stringify({
                              "type": "REDIRECT",
                              "data": "SCAN_CARD"
                            }));

                            ws.send(JSON.stringify({
                              "type": "ERROR",
                              "data": "CARD_BLOCKED"
                            }));

                            CLIENT_STATE = "SCAN_CARD";
                          }
                        } else {
                          if(rows[0].Card_blocked == 1) {
                            ws.send(JSON.stringify({
                              "type": "ERROR",
                              "data": "CARD_BLOCKED"
                            }));
                          } else {
                            // PINCODE was success
                            ws.send(JSON.stringify({
                              "type": "REDIRECT",
                              "data": "OPTIONS"
                            }));
  
                            user_id = rows[0].Customer_ID;
                            
                            CLIENT_STATE = "OPTIONS"
                          }

                          pincode_error_count = 0;
                        }
                    });

                    pincode_input = "";
                  } 
              } else if(CLIENT_STATE == "GELD_OPNEMEN") {
                // ws.send(JSON.stringify({
                //   "type": "GELD_INVOEREN",
                //   "data": pincodeCharacter
                // }));

                if(pincodeCharacter == "#") {
                  ws.send(JSON.stringify({
                    "type": "GELD_INVOEREN",
                    "data": "#"
                  }));

                  if(cash_count > 0) {
                    cash_count--;
                    cash_input = cash_input.substring(0, cash_input.length-1);
                  }
                } else if(pincodeCharacter == "*") {
                  if(parseInt(cash_input) > 100 || parseInt(cash_input) < 5 || cash_input == "") {
                    ws.send(JSON.stringify({
                      "type": "ERROR",
                      "data": "INVALID_CASH_AMOUNT"
                    }));
                  } else {
                    // GELD_OPNEMEN was success
                    ws.send(JSON.stringify({
                      "type": "REDIRECT",
                      "data": "CASH_COMBINATION"
                    }));
                    CLIENT_STATE = "CASH_COMBINATION";
                  }
                } else {
                  if(cash_count < 3) {
                    ws.send(JSON.stringify({
                      "type": "GELD_INVOEREN",
                      "data": pincodeCharacter
                    }));
  
                    cash_count++;
                    cash_input += pincodeCharacter;
                  } 
                }
              }
              break;
          }
      } catch(err) { // Could not parse JSON data, so it is an UID
          if(CLIENT_STATE == "SCAN_CARD") {
            global_uid = data.trim();
            console.log(global_uid);

            db.query("SELECT Customer_ID, Card_blocked FROM Customer WHERE Pass_number = ?", [global_uid]).then(([rows, fields]) => {
              if(rows.length == 0) {
                ws.send(JSON.stringify({
                  "type": "ERROR",
                  "data": "SCAN_CARD_NOT_EXIST"
                }));
                CLIENT_STATE = "SCAN_CARD";
              } else {
                if(rows[0].Card_blocked == true) {
                  ws.send(JSON.stringify({
                    "type": "ERROR",
                    "data": "CARD_BLOCKED"
                  }));
                } else {
                  ws.send(JSON.stringify({
                    "type": "REDIRECT",
                    "data": "PINCODE"
                  }));
                  CLIENT_STATE = "PINCODE";
                }
              }
            });
          } 
        }
    });

    // Incoming WebSockets Data
    ws.on('message', data => {
      switch(data.toString()) {
        case "UITLOGGEN":
          ws.send(JSON.stringify({
            "type": "REDIRECT",
            "data": "SCAN_CARD"
          }));

          user_id = null;
          CLIENT_STATE = "SCAN_CARD";
          break;
        case "USER_DATA":
          db.query("SELECT Name FROM Customer WHERE Customer_ID = ?", [user_id]).then(([rows, fields]) => {
            let name = rows[0].Name;

            ws.send(JSON.stringify({
              "type": "USER_DATA",
              "data": name
            }));
          });
          break;
        case "GET_INFO":
          ws.send(JSON.stringify({
            "type": "REDIRECT",
            "data": "GET_INFO"
          }));
          CLIENT_STATE = "GET_INFO";

          db.query("SELECT Name, Balance, IBAN, Creation_date FROM Customer WHERE Customer_ID = ?", [user_id]).then(([rows, fields]) => {
            ws.send(JSON.stringify({
              "type": "GET_INFO",
              "name": rows[0].Name,
              "balance": rows[0].Balance,
              "iban": rows[0].IBAN,
              "creation_date": rows[0].Creation_date
            }));
          });
          break;
        case "BACK":
          if(CLIENT_STATE == "GET_INFO" || CLIENT_STATE == "GELD_OPNEMEN") {
            ws.send(JSON.stringify({
              "type": "REDIRECT",
              "data": "OPTIONS"
            }));

            CLIENT_STATE = "OPTIONS";
          } else if(CLIENT_STATE == "CASH_COMBINATION") {
            ws.send(JSON.stringify({
              "type": "REDIRECT",
              "data": "GELD_OPNEMEN"
            }));
            
            CLIENT_STATE = "GELD_OPNEMEN";
          }
          break;
        case "GELD_OPNEMEN":
          ws.send(JSON.stringify({
              "type": "REDIRECT",
              "data": "GELD_OPNEMEN"
          }));

          CLIENT_STATE = "GELD_OPNEMEN";
          break;
        case "GET_COMBINATIONS":
          let combinations = findCashCombinations(parseInt(cash_input), bills);
        
          ws.send(JSON.stringify({
            "type": "COMBINATIONS",
            "data": combinations
          }));
        
          break;
      }
    });
});

// APIs
// app.get("/uitloggen", (req, res) => {
//   ws.send(JSON.stringify({
//     "type": "REDIRECT",
//     "data": "SCAN_CARD"
//   }));
//   CLIENT_STATE = "SCAN_CARD";
//   res.json({status: "success"});
// });

app.listen(80, () => console.log("Creating Server: http://localhost/"));