import { db } from "./createDbConnectioViaSSH.js";
import { global_vars } from "./handleWebSocketConnection.js";

export function handleSerialConnection(ws, data) {
    try {
        // Parsing incoming data
        let dataObj = JSON.parse(data);

        // Selecting which type of data to handle
        switch(dataObj.type) {
          case "KEYPAD":
              let pincodeCharacter = String.fromCharCode(dataObj.data);
              // Handle pincode data
              if(global_vars.CLIENT_STATE == "PINCODE") {
                  //console.log(dataObj);

                  // '#' is used as a backspace
                  if(pincodeCharacter == "#") {
                    ws.send(JSON.stringify({
                      "type": "PINCODE",
                      "data": "#"
                    }));

                    if(global_vars.pincode_count > 0) {
                      global_vars.pincode_count--;
                      global_vars.pincode_input = global_vars.pincode_input.substring(0, global_vars.pincode_input.length-1);
                    }
                  } else if(pincodeCharacter == "*") {
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
                  } else if(global_vars.pincode_count < 4) {
                    // Sending pincode number to client
                    ws.send(JSON.stringify({
                      "type": "PINCODE",
                      "data": "*"
                    }));
                    global_vars.pincode_count++;
                    global_vars.pincode_input += pincodeCharacter;
                  }

                  // When pincode length is equal to 4, then check the pincode
                  if(global_vars.pincode_count >= 4) {
                    
                  } 
              } else if(global_vars.CLIENT_STATE == "GELD_OPNEMEN") { // Keypad data is from 'GELD_OPNEMEN' page
                // '#' is used as a backspace
                if(pincodeCharacter == "#") {
                  ws.send(JSON.stringify({
                    "type": "GELD_INVOEREN",
                    "data": "#"
                  }));

                  if(global_vars.cash_count > 0) {
                    global_vars.cash_count--;
                    global_vars.cash_input = global_vars.cash_input.substring(0, global_vars.cash_input.length-1);
                  }
                } else if(pincodeCharacter == "*") { // '*' is used as an enter key
                  // Cash amount must be between 5-100 and must not be empty
                  if(parseInt(global_vars.cash_input) > 100 || parseInt(global_vars.cash_input) < 5 || global_vars.cash_input == "") {
                    ws.send(JSON.stringify({
                      "type": "ERROR",
                      "data": "INVALID_CASH_AMOUNT"
                    }));
                    // Cash amount must be a multiple of 5
                  } else if(parseInt(global_vars.cash_input) % 5 != 0) {
                    ws.send(JSON.stringify({
                      "type": "ERROR",
                      "data": "INVALID_MULTIPLE"
                    }));
                  } else {
                    // Checking if the customer has enough balance
                    db.query("SELECT Balance FROM Customer WHERE Customer_ID = ?", [global_vars.user_id]).then(([rows, fields]) => {
                      if(rows[0].Balance < parseInt(global_vars.cash_input)) {
                        ws.send(JSON.stringify({
                          "type": "ERROR",
                          "data": "LOW_BALANCE"
                        }))
                      } else {
                        // GELD_OPNEMEN was success
                        ws.send(JSON.stringify({
                          "type": "REDIRECT",
                          "data": "CASH_COMBINATION"
                        }));
                        global_vars.CLIENT_STATE = "CASH_COMBINATION";
                      }
                    });
                  }
                } else {
                  if(global_vars.cash_count < 3) {
                    ws.send(JSON.stringify({
                      "type": "GELD_INVOEREN",
                      "data": pincodeCharacter
                    }));
  
                    global_vars.cash_count++;
                    global_vars.cash_input += pincodeCharacter;
                  } 
                }
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
          if(global_vars.CLIENT_STATE == "SCAN_CARD") {
            global_vars.global_uid = data.trim();
            //console.log(global_vars.global_uid);

            // Looking if the scanned UID is in the database
            db.query("SELECT Customer_ID, Card_blocked FROM Customer WHERE Pass_number = ?", [global_vars.global_uid]).then(([rows, fields]) => {
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
        }
}