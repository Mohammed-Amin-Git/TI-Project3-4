import { GLOBAL, NOOBRequest } from "../../handleWebSocketConnection.js";
import { db } from "../databaseConnectionModule/createDBConnectionViaSSH.js";

export async function handleUserData(ws) {
    if(GLOBAL.NOOB_FLAG) {
      const response = await NOOBRequest("POST", "accountinfo", GLOBAL.global_iban, {"uid": GLOBAL.global_uid, "pincode": GLOBAL.NOOB_USER_PINCODE});
      let name = response.data.firstname;

      ws.send(JSON.stringify({
        "type": "USER_DATA",
        "data": name
      }));
      return;
    }

    db.query("SELECT Firstname FROM Customer WHERE Customer_ID = ?", [GLOBAL.user_id]).then(([rows, fields]) => {
        let name = rows[0].Firstname;

        ws.send(JSON.stringify({
          "type": "USER_DATA",
          "data": name
        }));
    });
}

export async function handleGetInfo(ws) {
  if(GLOBAL.NOOB_FLAG) {
    const response = await NOOBRequest("POST", "accountinfo", GLOBAL.global_iban, {"uid": GLOBAL.global_uid, "pincode": GLOBAL.NOOB_USER_PINCODE});
    console.log("Sending NOOB GET INFO");
    ws.send(JSON.stringify({
      "type": "GET_INFO",
      "customer_id": "",
      "name": `${response.data.firstname} ${response.data.lastname}`,
      "balance": Math.round(response.data.balance / 100, 2),
      "iban": GLOBAL.global_iban,
      "creation_date": ""
    }));
  } else {
    db.query("SELECT Customer_ID, Firstname, Lastname, Balance, IBAN, Creation_date FROM Customer WHERE Customer_ID = ?", [GLOBAL.user_id]).then(([rows, fields]) => {
      ws.send(JSON.stringify({
        "type": "GET_INFO",
        "customer_id": rows[0].Customer_ID,
        "name": `${rows[0].Firstname} ${rows[0].Lastname}`,
        "balance": Math.round(rows[0].Balance / 100, 2),
        "iban": rows[0].IBAN,
        "creation_date": rows[0].Creation_date
      }));
    });
  }

  ws.send(JSON.stringify({
    "type": "REDIRECT",
    "data": "GET_INFO"
  }));
  GLOBAL.CLIENT_STATE = "GET_INFO";
}