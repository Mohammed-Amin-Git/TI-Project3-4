import { db } from "./createDBConnectionViaSSH.js";
import { global_vars } from "./handleWebSocketConnection.js";

export function handleIncomingUID(ws, uid) {
    // Looking if the scanned UID is in the database
    db.query("SELECT Customer_ID, Card_blocked FROM Customer WHERE Pass_number = ?", [uid]).then(([rows, fields]) => {
        if(rows.length == 0) {
          ws.send(JSON.stringify({
            "type": "ERROR",
            "data": "SCAN_CARD_NOT_EXIST"
          }));
          global_vars.CLIENT_STATE = "SCAN_CARD";

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

                global_vars.CLIENT_STATE = "PINCODE";
            }
        }
    });
}