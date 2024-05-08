import { db } from "../databaseConnectionModule/createDBConnectionViaSSH.js";
import { GLOBAL } from "../../handleWebSocketConnection.js";

export function handleSnelpinnen(ws) {
    ws.send(JSON.stringify({
        "type": "REDIRECT",
        "data": "SNELPINNEN"
    }));

    GLOBAL.CLIENT_STATE = "SNELPINNEN";
    GLOBAL.PREVIOUS_MONEY_METHOD = "SNELPINNEN";
}

export function handleSelectSnelpinnen(ws, amount) {
    // Implement NOOB version
    let allowed_snelpinnen = [10, 20, 50, 70, 100];

    if(!allowed_snelpinnen.includes(amount)) {
      ws.send(JSON.stringify({
        "type": "ERROR",
        "data": "INVALID_QUICK_PIN"
      }));
      
    } else {
      db.query("SELECT Balance FROM Customer WHERE Customer_ID = ?", [GLOBAL.user_id]).then(([rows, fields]) => {
          if(rows[0].Balance < parseInt(amount)) {
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
      });
    }
}