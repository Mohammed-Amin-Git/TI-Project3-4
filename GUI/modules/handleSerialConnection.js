import { handleGeldOpnemen } from "./handleGeldOpnemen.js";
import { handleIncomingUID } from "./handleIncomingUID.js";
import { handlePincodeData } from "./handlePincodeData.js";
import { global_vars } from "./handleWebSocketConnection.js";

export function handleSerialConnection(ws, data) {
    try {
        // Parsing incoming data
        let dataObj = JSON.parse(data);

        // Selecting which type of data to handle
        switch(dataObj.type) {
          case "KEYPAD":
              let keypadCharacter = String.fromCharCode(dataObj.data);
              
              if(global_vars.CLIENT_STATE == "PINCODE") {
                handlePincodeData(ws, keypadCharacter); // Handle PINCODE data

              } else if(global_vars.CLIENT_STATE == "GELD_OPNEMEN") { // Handle GELD_OPNEMEN data
                handleGeldOpnemen(ws, keypadCharacter);

              }
              break;
          case "DISPENSE_STATUS":
                if(dataObj.data == "SUCCESS") {
                  ws.send(JSON.stringify({
                    "type": "SUCCESS",
                    "data": "DISPENSE_SUCCESS"
                  }));

                  ws.send(JSON.stringify({
                    "type": "REDIRECT",
                    "data": "RECEIPT_OPTION"
                  }));
                  
                  global_vars.CLIENT_STATE = "RECEIPT_OPTION";
                }
              break;
          case "RECEIPT_STATUS":
              if(dataObj.data == "SUCCESS") {
                ws.send(JSON.stringify({
                  "type": "REDIRECT",
                  "data": "OPTIONS"
                }));

                global_vars.CLIENT_STATE = "OPTIONS";
              }
              break;
          }
      } catch(err) { // Could not parse JSON data, so it is an UID
          if(global_vars.CLIENT_STATE == "SCAN_CARD" && err instanceof SyntaxError) {
            let uid = data.trim();
            global_vars.global_uid = uid;

            handleIncomingUID(ws, uid);
          } 
      }
}