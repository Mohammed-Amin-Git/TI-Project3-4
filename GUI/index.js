import { ReadlineParser } from '@serialport/parser-readline';
import { createTunnel } from 'tunnel-ssh';
import { SerialPort } from 'serialport';
import { WebSocketServer } from 'ws';
import mysql from 'mysql2/promise';
import express, { json } from 'express';
import 'dotenv/config';
import moment from 'moment';
import { cashCombinationArrayToString, findCashCombinations } from './cashCombination.js';

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

    let cash_combinations;
    let cash_combination;
    let cash_amount;

    let global_current_date;

    // Incoming Serial data
    parser.on('data', (data) => {
      try {
        // Parsing incoming data
        let dataObj = JSON.parse(data);
        console.log(dataObj);
        //console.log(dataObj);

        // Selecting which type of data to handle
        switch(dataObj.type) {
          case "KEYPAD":
              let pincodeCharacter = String.fromCharCode(dataObj.data);
              // Handle pincode data
              if(CLIENT_STATE == "PINCODE") {
                  // console.log(dataObj);

                  // '#' is used as a backspace
                  if(pincodeCharacter == "#") {
                    ws.send(JSON.stringify({
                      "type": "PINCODE",
                      "data": "#"
                    }));

                    if(pincode_count > 0) {
                      pincode_count--;
                      pincode_input = pincode_input.substring(0, pincode_input.length-1);
                    }
                  } else if(pincodeCharacter == "*") {
                    CLIENT_STATE = "OPTIONS";
                    pincode_count = 0;

                    // Looking for a match in the database
                    db.query("SELECT Customer_ID, Pincode, Card_blocked FROM Customer WHERE Pass_number = ? AND Pincode = ?", [global_uid, parseInt(pincode_input)])
                    .then(([rows, fields]) => {
                        // No match found
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
                          // Checking if the card is blocked
                          if(rows[0].Card_blocked) {
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
                  } else if(pincode_count < 4) {
                    // Sending pincode number to client
                    ws.send(JSON.stringify({
                      "type": "PINCODE",
                      "data": "*"
                    }));
                    pincode_count++;
                    pincode_input += pincodeCharacter;
                  }

                  // When pincode length is equal to 4, then check the pincode
                  if(pincode_count >= 4) {
                    
                  } 
              } else if(CLIENT_STATE == "GELD_OPNEMEN") { // Keypad data is from 'GELD_OPNEMEN' page
                // '#' is used as a backspace
                if(pincodeCharacter == "#") {
                  ws.send(JSON.stringify({
                    "type": "GELD_INVOEREN",
                    "data": "#"
                  }));

                  if(cash_count > 0) {
                    cash_count--;
                    cash_input = cash_input.substring(0, cash_input.length-1);
                  }
                } else if(pincodeCharacter == "*") { // '*' is used as an enter key
                  // Cash amount must be between 5-100 and must not be empty
                  if(parseInt(cash_input) > 100 || parseInt(cash_input) < 5 || cash_input == "") {
                    ws.send(JSON.stringify({
                      "type": "ERROR",
                      "data": "INVALID_CASH_AMOUNT"
                    }));
                    // Cash amount must be a multiple of 5
                  } else if(parseInt(cash_input) % 5 != 0) {
                    ws.send(JSON.stringify({
                      "type": "ERROR",
                      "data": "INVALID_MULTIPLE"
                    }));
                  } else {
                    // Checking if the customer has enough balance
                    db.query("SELECT Balance FROM Customer WHERE Customer_ID = ?", [user_id]).then(([rows, fields]) => {
                      if(rows[0].Balance < parseInt(cash_input)) {
                        ws.send(JSON.stringify({
                          "type": "ERROR",
                          "data": "LOW_BALANCE"
                        }))
                      } else {
                        // GELD_OPNEMEN was success
                        ws.send(JSON.stringify({
                          "type": "REDIRECT",
                          "data": "CASH_COMBINATION"
                        }));
                        CLIENT_STATE = "CASH_COMBINATION";
                      }
                    });
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
            case "DISPENSE_STATUS":
                if(dataObj.data == "SUCCESS") {
                  ws.send(JSON.stringify({
                    "type": "SUCCESS",
                    "data": "DISPENSE_SUCCESS"
                  }));

                  ws.send(JSON.stringify({
                    "type": "REDIRECT",
                    "data": "RECEIPT_OPTION"
                  }));
                  
                  CLIENT_STATE = "RECEIPT_OPTION";
                }
              break;
            case "RECEIPT_STATUS":
              if(dataObj.data == "SUCCESS") {
                ws.send(JSON.stringify({
                  "type": "REDIRECT",
                  "data": "OPTIONS"
                }));

                CLIENT_STATE = "OPTIONS";
              } else if(dataObj.data == "REDIRECT") {
                ws.send(JSON.stringify({
                  "type": "REDIRECT",
                  "data": "RECEIPT_WAIT"
                }));

                CLIENT_STATE = "RECEIPT_WAIT";
              }
              break;
          }
      } catch(err) { // Could not parse JSON data, so it is an UID
          if(CLIENT_STATE == "SCAN_CARD") {
            global_uid = data.trim();
            // console.log(global_uid);

            // Looking if the scanned UID is in the database
            db.query("SELECT Customer_ID, Card_blocked FROM Customer WHERE Pass_number = ?", [global_uid]).then(([rows, fields]) => {
              if(rows.length == 0) {
                ws.send(JSON.stringify({
                  "type": "ERROR",
                  "data": "SCAN_CARD_NOT_EXIST"
                }));
                CLIENT_STATE = "SCAN_CARD";
              } else {
                // Checking if the card is blocked
                if(rows[0].Card_blocked) {
                  ws.send(JSON.stringify({
                    "type": "ERROR",
                    "data": "CARD_BLOCKED"
                  }));
                } else {
                  // SCAN_CARD success
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
      let json_data = JSON.parse(data);

      switch(json_data.type) {
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

            cash_input = "";
            cash_count = 0;
            CLIENT_STATE = "OPTIONS";
          } else if(CLIENT_STATE == "CASH_COMBINATION") {
            ws.send(JSON.stringify({
              "type": "REDIRECT",
              "data": "GELD_OPNEMEN"
            }));
            
            cash_input = "";
            cash_count = 0;
            CLIENT_STATE = "GELD_OPNEMEN";
          } else if(CLIENT_STATE == "TRANSACTION") {
            ws.send(JSON.stringify({
              "type": "REDIRECT",
              "data": "OPTIONS"
            }));

            CLIENT_STATE = "OPTIONS";
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
          let combinations = findCashCombinations(parseInt(cash_input), bills).combinations;
          combinations.sort((a,b) => a.length - b.length); // Sorting the combinations by array length ascending
          if(combinations.length > 3) {
            combinations = combinations.slice(0, 3);
          }

          cash_combinations = combinations;
          cash_amount = parseInt(cash_input);

          ws.send(JSON.stringify({
            "type": "COMBINATIONS",
            "data": combinations,
            "amount": cash_input
          }));
        
          break;
        case "SELECT_COMBINATION":
          cash_input = "";
          cash_count = 0;
          cash_combination = cash_combinations[json_data.number];

          // Updating the balace in the database
          db.query("SELECT Balance FROM Customer WHERE Customer_ID = ?", [user_id]).then(([rows, fields]) => {
            let balance = rows[0].Balance;
            let new_balance = balance - cash_amount;

            db.query("UPDATE Customer SET Balance = ? WHERE Customer_ID = ?", [new_balance, user_id]);
            console.log("Balance updated!");
          });

          // Adding transcation to the database
          global_current_date = moment().format('YYYY-MM-DD hh:mm:ss');
          db.query("INSERT INTO Transaction (Date, Customer_ID, Transaction_amount) VALUES(?,?,?)", [global_current_date, user_id, cash_amount]);

          // Sending cash_combination array to the microcontroller so that it can be dispensed
          port.write(JSON.stringify({
            "type": "DISPENSE_CASH",
            "cash_combination": cash_combination
          }));

          ws.send(JSON.stringify({
            "type": "REDIRECT",
            "data": "DISPENSE_WAIT"
          }));
          
          CLIENT_STATE = "DISPENSE_WAIT";
          break;
        case "PRINT_RECEIPT":
          if(json_data.receipt_option) {
            // Sending data to the microcontroller so that it can print a receipt
            db.query("SELECT MAX(Transaction.Transaction_ID) AS Transcation_ID, Customer.IBAN FROM Transaction INNER JOIN Customer ON Transaction.Customer_ID = Customer.Customer_ID WHERE Customer.Customer_ID = ?;", [user_id]).then(([rows, fields]) => {
              port.write(JSON.stringify({
                "type": "PRINT_RECEIPT",
                "date": global_current_date,
                "amount": cash_amount.toString(),
                "combination": cashCombinationArrayToString(cash_combination),
                "iban": rows[0].IBAN, // TODO: Obfuscate IBAN before sending to the microcontroller
                "transaction_id": rows[0].Transcation_ID.toString()
              }));
            });
          } else {
            ws.send(JSON.stringify({
              "type": "REDIRECT",
              "data": "OPTIONS"
            }));

            CLIENT_STATE = "OPTIONS";
          }
          break;
        case "TRANSACTION":
          ws.send(JSON.stringify({
            "type": "REDIRECT",
            "data": "TRANSACTION"
          }));

          CLIENT_STATE = "TRANSACTION";

          db.query("SELECT Transaction_ID, Date, Transaction_amount FROM Transaction WHERE Customer_ID = ?", [user_id]).then(([rows, fields]) => {
            ws.send(JSON.stringify({
              "type": "TRANSACTIONS",
              "transactions": rows
            }));
          }); 
          break;
      }
    });
});

app.listen(80, () => console.log("Creating Server: http://localhost/"));