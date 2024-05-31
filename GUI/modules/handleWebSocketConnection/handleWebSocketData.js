import { handleGeldOpnemenRedirect, handleGetCashCombinations, handleSelectCashCombinations } from "./handleWebSocketData/handleGeldOpnemen.js";
import { handleSelectSnelpinnen, handleSnelpinnen } from "./handleWebSocketData/handleSnelpinnen.js";
import { handlePrintReceipt, handleTransaction } from "./handleWebSocketData/handleReceipt.js";
import { handleGetInfo, handleUserData } from "./handleWebSocketData/handleUserData.js";
import { handleBack, handleUitloggen } from "./handleWebSocketData/handleUitloggen.js";

// Function to handle WebSocket data from the client
export function handleWebSocketData(ws, data, port) {
  let json_data = JSON.parse(data); // Parsing the json data

  // Checking which type of data we are receiving
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
      handleTransaction(ws); 
      break;
    case "SNELPINNEN":
      handleSnelpinnen(ws);
      break;
    case "SELECT_SNELPINNEN":
      handleSelectSnelpinnen(ws, json_data.amount);
      break;
  }
}