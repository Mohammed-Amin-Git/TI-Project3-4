import { cashCombinationArrayToString, findCashCombinations } from "./cashCombination.js";
import { db } from "./createDBConnectionViaSSH.js";
import { bills, global_vars } from "./handleWebSocketConnection.js";
import moment from 'moment';

export function handleWebSocketData(ws, data, port) {
    let json_data = JSON.parse(data);

      switch(json_data.type) {
        case "UITLOGGEN":
          ws.send(JSON.stringify({
            "type": "REDIRECT",
            "data": "SCAN_CARD"
          }));

          global_vars.user_id = null;
          global_vars.CLIENT_STATE = "SCAN_CARD";
          break;
        case "USER_DATA":
          db.query("SELECT Firstname FROM Customer WHERE Customer_ID = ?", [global_vars.user_id]).then(([rows, fields]) => {
            let name = rows[0].Firstname;

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
          global_vars.CLIENT_STATE = "GET_INFO";

          db.query("SELECT Customer_ID, Name, Balance, IBAN, Creation_date FROM Customer WHERE Customer_ID = ?", [global_vars.user_id]).then(([rows, fields]) => {
            ws.send(JSON.stringify({
              "type": "GET_INFO",
              "customer_id": rows[0].Customer_ID,
              "name": rows[0].Name,
              "balance": rows[0].Balance,
              "iban": rows[0].IBAN,
              "creation_date": rows[0].Creation_date
            }));
          });
          break;
        case "BACK":
          if(global_vars.CLIENT_STATE == "GET_INFO" || global_vars.CLIENT_STATE == "GELD_OPNEMEN") {
            ws.send(JSON.stringify({
              "type": "REDIRECT",
              "data": "OPTIONS"
            }));

            global_vars.cash_input = "";
            global_vars.cash_count = 0;
            global_vars.CLIENT_STATE = "OPTIONS";
          } else if(global_vars.CLIENT_STATE == "CASH_COMBINATION") {
            ws.send(JSON.stringify({
              "type": "REDIRECT",
              "data": "GELD_OPNEMEN"
            }));
            
            global_vars.cash_input = "";
            global_vars.cash_count = 0;
            global_vars.CLIENT_STATE = "GELD_OPNEMEN";
          } else if(global_vars.CLIENT_STATE == "TRANSACTION") {
            ws.send(JSON.stringify({
              "type": "REDIRECT",
              "data": "OPTIONS"
            }));

            global_vars.CLIENT_STATE = "OPTIONS";
          }
          break;
        case "GELD_OPNEMEN":
          ws.send(JSON.stringify({
              "type": "REDIRECT",
              "data": "GELD_OPNEMEN"
          }));

          global_vars.CLIENT_STATE = "GELD_OPNEMEN";
          break;
        case "GET_COMBINATIONS":
          let combinations = findCashCombinations(parseInt(global_vars.cash_input), bills).combinations;
          combinations.sort((a,b) => a.length - b.length); // Sorting the combinations by array length ascending
          if(combinations.length > 3) {
            combinations = combinations.slice(0, 3);
          }

          global_vars.cash_combinations = combinations;
          global_vars.cash_amount = parseInt(global_vars.cash_input);

          ws.send(JSON.stringify({
            "type": "COMBINATIONS",
            "data": combinations,
            "amount": global_vars.cash_input
          }));
        
          break;
        case "SELECT_COMBINATION":
          global_vars.cash_input = "";
          global_vars.cash_count = 0;
          global_vars.cash_combination = global_vars.cash_combinations[json_data.number];

          // Updating the balace in the database
          db.query("SELECT Balance FROM Customer WHERE Customer_ID = ?", [global_vars.user_id]).then(([rows, fields]) => {
            let balance = rows[0].Balance;
            let new_balance = balance - global_vars.cash_amount;

            db.query("UPDATE Customer SET Balance = ? WHERE Customer_ID = ?", [new_balance, global_vars.user_id]);
            console.log("Balance updated!");
          });

          // Adding transcation to the database
          global_vars.global_current_date = moment().format('YYYY-MM-DD hh:mm:ss');
          db.query("INSERT INTO Transaction (Date, Customer_ID, Transaction_amount) VALUES(?,?,?)", [global_vars.global_current_date, global_vars.user_id, global_vars.cash_amount]);

          // Sending cash_combination array to the microcontroller so that it can be dispensed
          port.write(JSON.stringify({
            "type": "DISPENSE_CASH",
            "cash_combination": global_vars.cash_combination
          }));

          ws.send(JSON.stringify({
            "type": "REDIRECT",
            "data": "DISPENSE_WAIT"
          }));
          
          global_vars.CLIENT_STATE = "DISPENSE_WAIT";
          break;
        case "PRINT_RECEIPT":
          if(json_data.receipt_option) {
            // Sending data to the microcontroller so that it can print a receipt
            db.query("SELECT MAX(Transaction.Transaction_ID) AS Transcation_ID, Customer.IBAN FROM Transaction INNER JOIN Customer ON Transaction.Customer_ID = Customer.Customer_ID WHERE Customer.Customer_ID = ?;", [global_vars.user_id]).then(([rows, fields]) => {
              let serialport_json_data = JSON.stringify({
                "type": "PRINT_RECEIPT",
                "date": global_vars.global_current_date,
                "amount": global_vars.cash_amount.toString(),
                "combination": cashCombinationArrayToString(global_vars.cash_combination),
                "iban": rows[0].IBAN, // TODO: Obfuscate IBAN before sending to the microcontroller
                "transaction_id": rows[0].Transcation_ID.toString()
              });
              console.log(serialport_json_data);

              port.write(serialport_json_data);
            });

            ws.send(JSON.stringify({
              "type": "REDIRECT",
              "data": "RECEIPT_WAIT"
            }));

            global_vars.CLIENT_STATE = "RECEIPT_WAIT";
          } else {
            ws.send(JSON.stringify({
              "type": "REDIRECT",
              "data": "OPTIONS"
            }));

            global_vars.CLIENT_STATE = "OPTIONS";
          }
          break;
        case "TRANSACTION":
          ws.send(JSON.stringify({
            "type": "REDIRECT",
            "data": "TRANSACTION"
          }));

          global_vars.CLIENT_STATE = "TRANSACTION";

          db.query("SELECT Transaction_ID, Date, Transaction_amount FROM Transaction WHERE Customer_ID = ? ORDER BY Transaction_ID DESC", [global_vars.user_id]).then(([rows, fields]) => {
            ws.send(JSON.stringify({
              "type": "TRANSACTIONS",
              "transactions": rows
            }));
          }); 
          break;
      }
}