import { db } from "./databaseConnectionModule/createDBConnectionViaSSH.js";
import { GLOBAL } from "../handleWebSocketConnection.js";
import { handleBack, handleUitloggen } from "./handleWebSocketData/handleUitloggen.js";
import { handleGetInfo, handleUserData } from "./handleWebSocketData/handleUserData.js";
import { handleGeldOpnemenRedirect, handleGetCashCombinations, handleSelectCashCombinations } from "./handleWebSocketData/handleGeldOpnemen.js";
import { handlePrintReceipt, handleTransaction } from "./handleWebSocketData/handleReceipt.js";

export function handleWebSocketData(ws, data, port) {
      let json_data = JSON.parse(data);

      switch(json_data.type) {
        case "UITLOGGEN":
          handleUitloggen(ws);
          break;
        case "USER_DATA":
          handleUserData(ws);
          break;
        case "GET_INFO":
          handleGetInfo(ws);
          break;
        case "BACK":
          handleBack(ws);
          break;
        case "GELD_OPNEMEN":
          handleGeldOpnemenRedirect(ws);
          break;
        case "GET_COMBINATIONS":
          handleGetCashCombinations(ws);
          break;
        case "SELECT_COMBINATION":
          handleSelectCashCombinations(ws, port, json_data.number);
          break;
        case "PRINT_RECEIPT":
          handlePrintReceipt(ws, port, json_data.receipt_option);
          break;
        case "TRANSACTION":
          if(GLOBAL.NOOB_FLAG) {
            ws.send(JSON.stringify({
              "type": "ERROR",
              "data": "NOOB_TRANSACTION"
            }));
          } else {
            handleTransaction(ws); 
          }
          break;
        case "SNELPINNEN":
          ws.send(JSON.stringify({
            "type": "REDIRECT",
            "data": "SNELPINNEN"
          }));

          GLOBAL.CLIENT_STATE = "SNELPINNEN";
          GLOBAL.PREVIOUS_MONEY_METHOD = "SNELPINNEN";

          break;
        case "SELECT_SNELPINNEN":
          // Implement NOOB version
          let allowed_snelpinnen = [10, 20, 50, 70, 100];
          if(!allowed_snelpinnen.includes(json_data.amount)) {
            ws.send(JSON.stringify({
              "type": "ERROR",
              "data": "INVALID_QUICK_PIN"
            }));
          } else {
            db.query("SELECT Balance FROM Customer WHERE Customer_ID = ?", [GLOBAL.user_id]).then(([rows, fields]) => {
                if(rows[0].Balance < parseInt(json_data.amount)) {
                  ws.send(JSON.stringify({
                    "type": "ERROR",
                    "data": "LOW_BALANCE"
                  }));
                } else {
                  ws.send(JSON.stringify({
                    "type": "REDIRECT",
                    "data": "CASH_COMBINATION"
                  }));
      
                  GLOBAL.CLIENT_STATE = "CASH_COMBINATION";
                  GLOBAL.cash_input = json_data.amount;
                }
            });
          }
          break;
      }
}