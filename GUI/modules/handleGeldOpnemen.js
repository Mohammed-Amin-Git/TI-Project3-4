import { db } from "./createDBConnectionViaSSH.js";
import { global_vars } from "./handleWebSocketConnection.js";

export function handleGeldOpnemen(ws, keypadCharacter) {
    switch(keypadCharacter) {
        case "#":
            ws.send(JSON.stringify({
                "type": "GELD_INVOEREN",
                "data": "#"
            }));
          
            if(global_vars.cash_count > 0) {
                global_vars.cash_count--;
                global_vars.cash_input = global_vars.cash_input.substring(0, global_vars.cash_input.length-1);
            }
            break;
        case "*":
            // Cash amount must be between 5-100 and must not be empty
            if(parseInt(global_vars.cash_input) > 100 || parseInt(global_vars.cash_input) < 5 || global_vars.cash_input == "") {
                ws.send(JSON.stringify({
                    "type": "ERROR",
                    "data": "INVALID_CASH_AMOUNT"
                }));
            
            // Cash amount must be a multiple of 5
            } else if(parseInt(global_vars.cash_input) % 5 != 0) {
                ws.send(JSON.stringify({
                    "type": "ERROR",
                    "data": "INVALID_MULTIPLE"
                }));

            } else {
                // Checking if the customer has enough balance
                db.query("SELECT Balance FROM Customer WHERE Customer_ID = ?", [global_vars.user_id]).then(([rows, fields]) => {
                    // Check if you user has enough balance
                    if(rows[0].Balance < parseInt(global_vars.cash_input)) {
                        ws.send(JSON.stringify({
                            "type": "ERROR",
                            "data": "LOW_BALANCE"
                        }));
                    } else {
                        // GELD_OPNEMEN was success
                        ws.send(JSON.stringify({
                            "type": "REDIRECT",
                            "data": "CASH_COMBINATION"
                        }));

                        global_vars.CLIENT_STATE = "CASH_COMBINATION";
                    }
                });
            }
            break;
        default:
            if(global_vars.cash_count < 3) {
                ws.send(JSON.stringify({
                    "type": "GELD_INVOEREN",
                    "data": keypadCharacter
                }));
          
                global_vars.cash_count++;
                global_vars.cash_input += keypadCharacter;
            } 
    }
}