import { GLOBAL } from "../../handleWebSocketConnection.js";
import { db } from "../databaseConnectionModule/createDBConnectionViaSSH.js";

export function validateIncomingAmount(ws, amount) {
    if(parseInt(amount) > 100 || parseInt(amount) < 5 || amount == "") {
        ws.send(JSON.stringify({
            "type": "ERROR",
            "data": "INVALID_CASH_AMOUNT"
        }));
    } else if(parseInt(amount) % 5 != 0) {
        ws.send(JSON.stringify({
            "type": "ERROR",
            "data": "INVALID_MULTIPLE"
        }));
    } else {
        // Checking if the customer has enough balance
        db.query("SELECT Balance FROM Customer WHERE Customer_ID = ?", [GLOBAL.user_id]).then(([rows, fields]) => {
            // Check if you user has enough balance
            if(rows[0].Balance < parseInt(amount)) {
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
}