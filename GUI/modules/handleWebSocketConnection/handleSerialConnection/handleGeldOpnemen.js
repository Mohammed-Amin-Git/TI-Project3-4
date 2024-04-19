import { db } from "../databaseConnectionModule/createDBConnectionViaSSH.js";
import { GLOBAL } from "../../handleWebSocketConnection.js";

export function handleGeldOpnemen(ws, keypadCharacter) {
    switch(keypadCharacter) {
        case "#":
            ws.send(JSON.stringify({
                "type": "GELD_INVOEREN",
                "data": "#"
            }));
          
            if(GLOBAL.cash_count > 0) {
                GLOBAL.cash_count--;
                GLOBAL.cash_input = GLOBAL.cash_input.substring(0, GLOBAL.cash_input.length-1);
            }
            break;
        case "*":
            // Cash amount must be between 5-100 and must not be empty
            if(parseInt(GLOBAL.cash_input) > 100 || parseInt(GLOBAL.cash_input) < 5 || GLOBAL.cash_input == "") {
                ws.send(JSON.stringify({
                    "type": "ERROR",
                    "data": "INVALID_CASH_AMOUNT"
                }));
            
            // Cash amount must be a multiple of 5
            } else if(parseInt(GLOBAL.cash_input) % 5 != 0) {
                ws.send(JSON.stringify({
                    "type": "ERROR",
                    "data": "INVALID_MULTIPLE"
                }));

            } else {
                // Checking if the customer has enough balance
                db.query("SELECT Balance FROM Customer WHERE Customer_ID = ?", [GLOBAL.user_id]).then(([rows, fields]) => {
                    // Check if you user has enough balance
                    if(rows[0].Balance < parseInt(GLOBAL.cash_input)) {
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

                        GLOBAL.CLIENT_STATE = "CASH_COMBINATION";
                    }
                });
            }
            break;
        default:
            if(GLOBAL.cash_count < 3) {
                ws.send(JSON.stringify({
                    "type": "GELD_INVOEREN",
                    "data": keypadCharacter
                }));
          
                GLOBAL.cash_count++;
                GLOBAL.cash_input += keypadCharacter;
            } 
    }
}