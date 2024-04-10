import { db } from "./createDBConnectionViaSSH.js";
import { global_vars } from "./handleWebSocketConnection.js";

export function handlePincodeData(ws, pincodeCharacter) {
    switch(pincodeCharacter) {
        case '#':
            ws.send(JSON.stringify({
                "type": "PINCODE",
                "data": "#"
              }));
      
              if(global_vars.pincode_count > 0) {
                global_vars.pincode_count--;
                global_vars.pincode_input = global_vars.pincode_input.substring(0, global_vars.pincode_input.length-1);
              }
            break;
        case '*':
            global_vars.CLIENT_STATE = "OPTIONS";
            global_vars.pincode_count = 0;

            // Looking for a match in the database
            db.query("SELECT Customer_ID, Pincode, Card_blocked FROM Customer WHERE Pass_number = ? AND Pincode = ?", [global_vars.global_uid, parseInt(global_vars.pincode_input)])
            .then(([rows, fields]) => {
                // No match found
                if(rows.length == 0) {
                global_vars.pincode_error_count++;
                global_vars.CLIENT_STATE = "PINCODE";

                ws.send(JSON.stringify({
                    "type": "ERROR",
                    "data": "PINCODE_INCORRECT",
                    "count": 3-global_vars.pincode_error_count
                }));

                if(global_vars.pincode_error_count >= 3) {
                    db.query("UPDATE Customer SET Card_blocked = TRUE WHERE Pass_number = ?", [global_vars.global_uid]);

                    ws.send(JSON.stringify({
                    "type": "REDIRECT",
                    "data": "SCAN_CARD"
                    }));

                    ws.send(JSON.stringify({
                    "type": "ERROR",
                    "data": "CARD_BLOCKED"
                    }));

                    global_vars.CLIENT_STATE = "SCAN_CARD";
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

                    global_vars.user_id = rows[0].Customer_ID;
                    
                    global_vars.CLIENT_STATE = "OPTIONS"
                }

                global_vars.pincode_error_count = 0;
                }
            });

            global_vars.pincode_input = "";
            break;
        default:
            if(global_vars.pincode_count < 4) {
                // Sending pincode number to client
                ws.send(JSON.stringify({
                    "type": "PINCODE",
                    "data": "*"
                }));
                global_vars.pincode_count++;
                global_vars.pincode_input += pincodeCharacter;
            }
    }
}