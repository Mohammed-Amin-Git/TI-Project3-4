import { db } from "../databaseConnectionModule/createDBConnectionViaSSH.js";
import { GLOBAL } from "../../handleWebSocketConnection.js";

// TODO: function handleIncomingUID should take a third parameter: IBAN
export function handleIncomingUID(ws, uid) {
    // Looking if the scanned UID is in the database
    db.query("SELECT Customer_ID, Card_blocked FROM Customer WHERE Pass_number = ?", [uid]).then(([rows, fields]) => {
        if(rows.length == 0) {

          // TODO: Check if the IBAN is available at another bank
          // TODO: Set NOOB flag
          ws.send(JSON.stringify({
            "type": "ERROR",
            "data": "SCAN_CARD_NOT_EXIST"
          }));
          GLOBAL.CLIENT_STATE = "SCAN_CARD";

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