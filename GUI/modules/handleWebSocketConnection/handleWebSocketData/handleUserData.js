import { GLOBAL } from "../../handleWebSocketConnection.js";
import { db } from "../databaseConnectionModule/createDBConnectionViaSSH.js";

export function handleUserData(ws) {
    // TODO: Implement NOOB version
    db.query("SELECT Firstname FROM Customer WHERE Customer_ID = ?", [GLOBAL.user_id]).then(([rows, fields]) => {
        let name = rows[0].Firstname;

        ws.send(JSON.stringify({
          "type": "USER_DATA",
          "data": name
        }));
    });
}

export function handleGetInfo(ws) {
  // TODO: Implement NOOB version
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
}