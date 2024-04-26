import { cashCombinationArrayToString, findCashCombinations, obfuscateIBAN } from "./cashModules/cashCombination.js";
import { db } from "./databaseConnectionModule/createDBConnectionViaSSH.js";
import { bills, GLOBAL, SESSION_TIME } from "../handleWebSocketConnection.js";
import moment from 'moment';

export function handleWebSocketData(ws, data, port) {
      let json_data = JSON.parse(data);

      switch(json_data.type) {
        case "UITLOGGEN":
          ws.send(JSON.stringify({
            "type": "REDIRECT",
            "data": "SCAN_CARD"
          }));

          clearTimeout(GLOBAL.SESSION_CONTAINER);

          GLOBAL.user_id = null;
          GLOBAL.CLIENT_STATE = "SCAN_CARD";
          break;
        case "USER_DATA":
          db.query("SELECT Firstname FROM Customer WHERE Customer_ID = ?", [GLOBAL.user_id]).then(([rows, fields]) => {
            let name = rows[0].Firstname;

            ws.send(JSON.stringify({
              "type": "USER_DATA",
              "data": name
            }));
          });
          break;
        case "GET_INFO":
          db.query("SELECT Customer_ID, Firstname, Lastname, Balance, IBAN, Creation_date FROM Customer WHERE Customer_ID = ?", [GLOBAL.user_id]).then(([rows, fields]) => {
            ws.send(JSON.stringify({
              "type": "GET_INFO",
              "customer_id": rows[0].Customer_ID,
              "name": `${rows[0].Firstname} ${rows[0].Lastname}`,
              "balance": rows[0].Balance,
              "iban": rows[0].IBAN,
              "creation_date": rows[0].Creation_date
            }));
          });

          ws.send(JSON.stringify({
            "type": "REDIRECT",
            "data": "GET_INFO"
          }));
          GLOBAL.CLIENT_STATE = "GET_INFO";
          break;
        case "BACK":
          if(GLOBAL.CLIENT_STATE == "GET_INFO" || GLOBAL.CLIENT_STATE == "GELD_OPNEMEN" || GLOBAL.CLIENT_STATE == "SNELPINNEN") {
            ws.send(JSON.stringify({
              "type": "REDIRECT",
              "data": "OPTIONS"
            }));

            GLOBAL.cash_input = "";
            GLOBAL.cash_count = 0;
            GLOBAL.CLIENT_STATE = "OPTIONS";
          } else if(GLOBAL.CLIENT_STATE == "CASH_COMBINATION") {
            GLOBAL.cash_input = "";
            GLOBAL.cash_count = 0;
            
            console.log(GLOBAL.PREVIOUS_MONEY_METHOD);

            if(GLOBAL.PREVIOUS_MONEY_METHOD == "GELD_OPNEMEN") {
              ws.send(JSON.stringify({
                "type": "REDIRECT",
                "data": "GELD_OPNEMEN"
              }));
              
              GLOBAL.CLIENT_STATE = "GELD_OPNEMEN";
            } else if(GLOBAL.PREVIOUS_MONEY_METHOD == "SNELPINNEN") {
              ws.send(JSON.stringify({
                "type": "REDIRECT",
                "data": "SNELPINNEN"
              }));
              GLOBAL.CLIENT_STATE = "SNELPINNEN";
            }
          } else if(GLOBAL.CLIENT_STATE == "TRANSACTION") {
            ws.send(JSON.stringify({
              "type": "REDIRECT",
              "data": "OPTIONS"
            }));

            GLOBAL.CLIENT_STATE = "OPTIONS";
          }
          break;
        case "GELD_OPNEMEN":
          ws.send(JSON.stringify({
              "type": "REDIRECT",
              "data": "GELD_OPNEMEN"
          }));

          GLOBAL.CLIENT_STATE = "GELD_OPNEMEN";
          GLOBAL.PREVIOUS_MONEY_METHOD = "GELD_OPNEMEN";
          break;
        case "GET_COMBINATIONS":
          let combinations = findCashCombinations(parseInt(GLOBAL.cash_input), bills).combinations;
          combinations.sort((a,b) => a.length - b.length); // Sorting the combinations by array length ascending
          if(combinations.length > 3) {
            combinations = combinations.slice(0, 3);
          }

          GLOBAL.cash_combinations = combinations;
          GLOBAL.cash_amount = parseInt(GLOBAL.cash_input);

          ws.send(JSON.stringify({
            "type": "COMBINATIONS",
            "data": combinations,
            "amount": GLOBAL.cash_input
          }));
        
          break;
        case "SELECT_COMBINATION":
          GLOBAL.cash_input = "";
          GLOBAL.cash_count = 0;
          GLOBAL.cash_combination = GLOBAL.cash_combinations[json_data.number];

          // Updating the balace in the database
          db.query("SELECT Balance FROM Customer WHERE Customer_ID = ?", [GLOBAL.user_id]).then(([rows, fields]) => {
            let balance = rows[0].Balance;
            let new_balance = balance - GLOBAL.cash_amount;

            db.query("UPDATE Customer SET Balance = ? WHERE Customer_ID = ?", [new_balance, GLOBAL.user_id]);
            console.log("Balance updated!");
          });

          // Adding transcation to the database
          GLOBAL.global_current_date = moment().format('YYYY-MM-DD hh:mm:ss');
          db.query("INSERT INTO Transaction (Date, Customer_ID, Transaction_amount) VALUES(?,?,?)", [GLOBAL.global_current_date, GLOBAL.user_id, GLOBAL.cash_amount]);

          // Sending cash_combination array to the microcontroller so that it can be dispensed
          port.write(JSON.stringify({
            "type": "DISPENSE_CASH",
            "cash_combination": GLOBAL.cash_combination
          }));

          ws.send(JSON.stringify({
            "type": "REDIRECT",
            "data": "DISPENSE_WAIT"
          }));
          
          clearTimeout(GLOBAL.SESSION_CONTAINER);
          GLOBAL.CLIENT_STATE = "DISPENSE_WAIT";
          break;
        case "PRINT_RECEIPT":
          if(json_data.receipt_option) {
            // Sending data to the microcontroller so that it can print a receipt
            db.query("SELECT MAX(Transaction.Transaction_ID) AS Transcation_ID, Customer.IBAN FROM Transaction INNER JOIN Customer ON Transaction.Customer_ID = Customer.Customer_ID WHERE Customer.Customer_ID = ?;", [GLOBAL.user_id]).then(([rows, fields]) => {
              let serialport_json_data = JSON.stringify({
                "type": "PRINT_RECEIPT",
                "date": GLOBAL.global_current_date,
                "amount": GLOBAL.cash_amount.toString(),
                "combination": cashCombinationArrayToString(GLOBAL.cash_combination),
                "iban": obfuscateIBAN(rows[0].IBAN),
                "transaction_id": rows[0].Transcation_ID.toString()
              });

              port.write(serialport_json_data);
            });

            ws.send(JSON.stringify({
              "type": "REDIRECT",
              "data": "RECEIPT_WAIT"
            }));

            GLOBAL.CLIENT_STATE = "RECEIPT_WAIT";
          } else {
            ws.send(JSON.stringify({
              "type": "REDIRECT",
              "data": "OPTIONS"
            }));

            GLOBAL.SESSION_CONTAINER = setTimeout(() => {
              ws.send(JSON.stringify({
                  "type": "REDIRECT",
                  "data": "SCAN_CARD"
              }));

              ws.send(JSON.stringify({
                  "type": "ERROR",
                  "data": "SESSION_EXPIRED" 
              }));

              GLOBAL.user_id = null;
              GLOBAL.CLIENT_STATE = "SCAN_CARD";
            }, SESSION_TIME);

            GLOBAL.CLIENT_STATE = "OPTIONS";
          }
          break;
        case "TRANSACTION":
          ws.send(JSON.stringify({
            "type": "REDIRECT",
            "data": "TRANSACTION"
          }));

          GLOBAL.CLIENT_STATE = "TRANSACTION";

          db.query("SELECT Transaction_ID, Date, Transaction_amount FROM Transaction WHERE Customer_ID = ? ORDER BY Transaction_ID DESC", [GLOBAL.user_id]).then(([rows, fields]) => {
            ws.send(JSON.stringify({
              "type": "TRANSACTIONS",
              "transactions": rows
            }));
          }); 
          break;
        case "SNELPINNEN":
          ws.send(JSON.stringify({
            "type": "REDIRECT",
            "data": "SNELPINNEN"
          }));

          GLOBAL.CLIENT_STATE = "SNELPINNEN";
          GLOBAL.PREVIOUS_MONEY_METHOD = "SNELPINNEN";

          break;
        case "SELECT_SNELPINNEN":
          let allowed_snelpinnen = [10, 20, 50, 70, 100];
          if(!allowed_snelpinnen.includes(json_data.amount)) {
            ws.send(JSON.stringify({
              "type": "ERROR",
              "data": "INVALID_QUICK_PIN"
            }));
          } else {
            db.query("SELECT Balance FROM Customer WHERE Customer_ID = ?", [GLOBAL.user_id]).then(([rows, fields]) => {
                if(rows[0].Balance < parseInt(json_data.amount)) {
                  ws.send(JSON.stringify({
                    "type": "ERROR",
                    "data": "LOW_BALANCE"
                  }));
                } else {
                  ws.send(JSON.stringify({
                    "type": "REDIRECT",
                    "data": "CASH_COMBINATION"
                  }));
      
                  GLOBAL.CLIENT_STATE = "CASH_COMBINATION";
                  GLOBAL.cash_input = json_data.amount;
                }
            });
          }
          break;
      }
}