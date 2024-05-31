import { db } from "../databaseConnectionModule/createDBConnectionViaSSH.js";
import { GLOBAL, NOOBRequest } from "../../handleWebSocketConnection.js";


export function handleSnelpinnen(ws) {
    ws.send(JSON.stringify({
        "type": "REDIRECT",
        "data": "SNELPINNEN"
    }));

    GLOBAL.CLIENT_STATE = "SNELPINNEN";
    GLOBAL.PREVIOUS_MONEY_METHOD = "SNELPINNEN";
}

export async function handleSelectSnelpinnen(ws, amount) {
    let allowed_snelpinnen = [10, 20, 50, 70, 100];

    if(!allowed_snelpinnen.includes(amount)) {
      ws.send(JSON.stringify({
        "type": "ERROR",
        "data": "INVALID_QUICK_PIN"
      }));
      
    } else {
      if(GLOBAL.NOOB_FLAG) {
        const response = await NOOBRequest("POST", "accountinfo", GLOBAL.global_iban, {
          "uid": GLOBAL.global_uid, 
          "pincode": GLOBAL.NOOB_USER_PINCODE
        });

        if((response.data.balance / 100) < amount) {
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
          GLOBAL.cash_input = amount;
        }
        return;
      }

      db.query("SELECT Balance FROM Customer WHERE Customer_ID = ?", [GLOBAL.user_id]).then(([rows, fields]) => {
        let current_balance = rows[0].Balance;
        const sql = "SELECT Transaction_amount FROM Transaction WHERE Date >= NOW() - INTERVAL 1 DAY AND Customer_ID = ?;";
        db.query(sql, [GLOBAL.user_id]).then(([rows, fields]) => {
            let total = 0;
            rows.forEach(user => {
              let amount = user.Transaction_amount;
              total += amount;
            });
            console.log(total);

            if(total + amount >= 500) {
              ws.send(JSON.stringify({
                "type": "ERROR",
                "data": "DAILY_LIMIT"
              }));
            } else if((current_balance / 100) < parseInt(amount)) {
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
              GLOBAL.cash_input = amount;
            }
        })
      });
    }
}