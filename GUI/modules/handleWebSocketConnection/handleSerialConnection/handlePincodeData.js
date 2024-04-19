import { db } from "../databaseConnectionModule/createDBConnectionViaSSH.js";
import { GLOBAL, SESSION_TIME } from "../../handleWebSocketConnection.js";

export function handlePincodeData(ws, pincodeCharacter) {
    switch(pincodeCharacter) {
        case '#':
            ws.send(JSON.stringify({
                "type": "PINCODE",
                "data": "#"
              }));
      
              if(GLOBAL.pincode_count > 0) {
                GLOBAL.pincode_count--;
                GLOBAL.pincode_input = GLOBAL.pincode_input.substring(0, GLOBAL.pincode_input.length-1);
              }
            break;
        case '*':
            GLOBAL.CLIENT_STATE = "OPTIONS";
            GLOBAL.pincode_count = 0;

            // Looking for a match in the database
            db.query("SELECT Customer_ID, Pincode, Card_blocked FROM Customer WHERE Pass_number = ? AND Pincode = ?", [GLOBAL.global_uid, parseInt(GLOBAL.pincode_input)])
            .then(([rows, fields]) => {
                // No match found
                if(rows.length == 0) {
                GLOBAL.pincode_error_count++;
                GLOBAL.CLIENT_STATE = "PINCODE";

                ws.send(JSON.stringify({
                    "type": "ERROR",
                    "data": "PINCODE_INCORRECT",
                    "count": 3-GLOBAL.pincode_error_count
                }));

                if(GLOBAL.pincode_error_count >= 3) {
                    db.query("UPDATE Customer SET Card_blocked = TRUE WHERE Pass_number = ?", [GLOBAL.global_uid]);

                    ws.send(JSON.stringify({
                    "type": "REDIRECT",
                    "data": "SCAN_CARD"
                    }));

                    ws.send(JSON.stringify({
                    "type": "ERROR",
                    "data": "CARD_BLOCKED"
                    }));

                    GLOBAL.CLIENT_STATE = "SCAN_CARD";
                }
                } else {
                // Checking if the card is blocked
                if(rows[0].Card_blocked) {
                    ws.send(JSON.stringify({
                    "type": "ERROR",
                    "data": "CARD_BLOCKED"
                    }));
                } else {
                    // PINCODE was success
                    ws.send(JSON.stringify({
                    "type": "REDIRECT",
                    "data": "OPTIONS"
                    }));

                    GLOBAL.user_id = rows[0].Customer_ID;
                    
                    GLOBAL.CLIENT_STATE = "OPTIONS";

                    GLOBAL.SESSION_CONTAINER = setTimeout(() => {
                        ws.send(JSON.stringify({
                            "type": "REDIRECT",
                            "data": "SCAN_CARD"
                        }));

                        ws.send(JSON.stringify({
                            "type": "ERROR",
                            "data": "SESSION_EXPIRED" 
                        }));

                        GLOBAL.user_id = null;
                        GLOBAL.CLIENT_STATE = "SCAN_CARD";
                    }, SESSION_TIME);
                }

                GLOBAL.pincode_error_count = 0;
                }
            });

            GLOBAL.pincode_input = "";
            break;
        default:
            if(GLOBAL.pincode_count < 4) {
                // Sending pincode number to client
                ws.send(JSON.stringify({
                    "type": "PINCODE",
                    "data": "*"
                }));
                GLOBAL.pincode_count++;
                GLOBAL.pincode_input += pincodeCharacter;
            }
    }
}