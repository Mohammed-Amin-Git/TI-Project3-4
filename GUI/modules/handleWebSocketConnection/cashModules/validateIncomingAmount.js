import { GLOBAL, NOOBRequest } from "../../handleWebSocketConnection.js";
import { db } from "../databaseConnectionModule/createDBConnectionViaSSH.js";

export async function validateIncomingAmount(ws, amount) {
    const sql = "SELECT Transaction_amount FROM Transaction WHERE Date >= NOW() - INTERVAL 1 DAY AND Customer_ID = ?;";
    db.query(sql, GLOBAL.user_id).then(async ([rows, fields]) => {
        let total = 0;
        rows.forEach(user => {
            let amount = user.Transaction_amount;
            total += amount;
        });

        if(total + amount >= 500) {
            ws.send(JSON.stringify({
                "type": "ERROR",
                "data": "DAILY_LIMIT"
              }));
        } else if(parseInt(amount) > 100 || parseInt(amount) < 5 || amount == "") {
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
            if(GLOBAL.NOOB_FLAG) {
                const response = await NOOBRequest("POST", "accountinfo", GLOBAL.global_iban, {"uid": GLOBAL.global_uid, "pincode": GLOBAL.NOOB_USER_PINCODE});
                const balance = response.data.balance;
    
                if(balance < parseInt(amount)) {
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
                }
    
                return;
            }
    
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
    })
}