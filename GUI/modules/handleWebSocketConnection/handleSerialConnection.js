import { handleGeldOpnemen } from "./handleSerialConnection/handleGeldOpnemen.js";
import { handleIncomingUID } from "./handleSerialConnection/handleIncomingUID.js";
import { handlePincodeData } from "./handleSerialConnection/handlePincodeData.js";
import { GLOBAL, SESSION_TIME } from "../handleWebSocketConnection.js";
import { db } from "./databaseConnectionModule/createDBConnectionViaSSH.js";
import { obfuscateIBAN } from "./cashModules/cashCombination.js";

export function handleSerialConnection(ws, data, port) {
        console.log(data);
        // Parsing incoming data
        let dataObj = JSON.parse(data);

        // Selecting which type of data to handle
        switch(dataObj.type) {
          case "UID":
            if(GLOBAL.CLIENT_STATE == "SCAN_CARD") {
              let uid = dataObj.data.trim();
              GLOBAL.global_uid = uid;
  
              handleIncomingUID(ws, uid);
            }
            break;
          case "KEYPAD":
              let keypadCharacter = String.fromCharCode(dataObj.data);
              
              if(GLOBAL.CLIENT_STATE == "PINCODE") {
                handlePincodeData(ws, keypadCharacter); // Handle PINCODE data

              } else if(GLOBAL.CLIENT_STATE == "GELD_OPNEMEN") { // Handle GELD_OPNEMEN data
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
                  
                  GLOBAL.CLIENT_STATE = "RECEIPT_OPTION";
                }
              break;
          case "RECEIPT_STATUS":
              if(dataObj.data == "SUCCESS") {
                ws.send(JSON.stringify({
                  "type": "REDIRECT",
                  "data": "SCAN_CARD"
                }));

                ws.send(JSON.stringify({
                  "type": "SUCCESS",
                  "data": "TRANSACTION_SUCCESS"
                }))

                GLOBAL.CLIENT_STATE = "SCAN_CARD";
              }
              break;
          }
}