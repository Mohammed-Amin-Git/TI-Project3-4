import { db } from "../databaseConnectionModule/createDBConnectionViaSSH.js";
import { GLOBAL, NOOBRequest } from "../../handleWebSocketConnection.js";

// TODO: function handleIncomingUID should take a third parameter: IBAN
export async function handleIncomingUID(ws, uid, iban) {
    if(uid == "" || iban == "" || !uid.match(/[0-9A-F]{8}/) || !iban.match(/[A-Z]{2}[0-9]{2}[A-Z]{4}[0-9]{10}/)) {
        ws.send(JSON.stringify({
            "type": "ERROR",
            "data": "INVALID_CARD"
        }));
        return;
    }
    
    // Looking if the scanned UID is in the database
    db.query("SELECT Customer_ID, Card_blocked FROM Customer WHERE Pass_number = ? AND IBAN = ?", [uid, iban]).then(async ([rows, fields]) => {
        // TODO: Remove iban.includes, this is only for testing purposes
        if(rows.length == 0 || iban.includes("TESB")) {
          // TODO: Check if the IBAN is available at another bank, then set NOOB flag
          const response = await NOOBRequest("POST", "accountinfo", iban, {"target": iban, "uid": uid});
          console.log(response);
          switch(response.status_code) {
            case 400:
                ws.send(JSON.stringify({
                    "type": "ERROR",
                    "data": "INVALID_CARD"
                }));
                break;
            case 404:
                ws.send(JSON.stringify({
                    "type": "ERROR",
                    "data": "SCAN_CARD_NOT_EXIST"
                }));
            case 403:
                ws.send(JSON.stringify({
                    "type": "ERROR",
                    "data": "CARD_BLOCKED"
                }));
            case 401:
                ws.send(JSON.stringify({
                    "type": "REDIRECT",
                    "data": "PINCODE"
                }));
    
                GLOBAL.NOOB_FLAG = true;
                GLOBAL.CLIENT_STATE = "PINCODE";
          }

        } else {
            // Checking if the card is blocked
            if(rows[0].Card_blocked) {
                ws.send(JSON.stringify({
                    "type": "ERROR",
                    "data": "CARD_BLOCKED"
                }));
            } else {
                // SCAN_CARD success
                ws.send(JSON.stringify({
                "type": "REDIRECT",
                "data": "PINCODE"
                }));

                GLOBAL.CLIENT_STATE = "PINCODE";
            }
        }
    });
}