import { handleGeldOpnemen } from "./handleSerialConnection/handleGeldOpnemen.js";
import { handleIncomingUID } from "./handleSerialConnection/handleIncomingUID.js";
import { handlePincodeData } from "./handleSerialConnection/handlePincodeData.js";
import { GLOBAL } from "../handleWebSocketConnection.js";

// The server receives serial data from the microcontroller in json format
export function handleSerialConnection(ws, data, port) {
        // Parsing incoming data
        let dataObj = JSON.parse(data);

        // Selecting which type of data to handle
        switch(dataObj.type) {
          case "CARD_INFO": // Data from the RFID card, containing a IBAN and an UID
            if(GLOBAL.CLIENT_STATE == "SCAN_CARD") {
              let uid = dataObj.uid.trim();
              let iban = dataObj.iban.trim();

              GLOBAL.global_uid = uid;
              GLOBAL.global_iban = iban;
  
              handleIncomingUID(ws, uid, iban);
            }
            break;
          case "KEYPAD": // Data from the Keypad, containing a character
              let keypadCharacter = String.fromCharCode(dataObj.data);
              
              // The Keypad is used when you enter your pincode, but also when entering a specific amount
              if(GLOBAL.CLIENT_STATE == "PINCODE") {
                handlePincodeData(ws, keypadCharacter); // Handle PINCODE data

              } else if(GLOBAL.CLIENT_STATE == "GELD_OPNEMEN") { // Handle GELD_OPNEMEN data
                handleGeldOpnemen(ws, keypadCharacter);

              }
              break;
          case "DISPENSE_STATUS": // Feedback after dispensing the money
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
          case "RECEIPT_STATUS": // Feedback after printing a receipt
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