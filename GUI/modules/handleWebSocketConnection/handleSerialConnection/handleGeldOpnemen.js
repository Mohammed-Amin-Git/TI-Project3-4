import { GLOBAL } from "../../handleWebSocketConnection.js";
import { validateIncomingAmount } from "../cashModules/validateIncomingAmount.js";

export function handleGeldOpnemen(ws, keypadCharacter) {
    switch(keypadCharacter) {
        case "#":
            ws.send(JSON.stringify({
                "type": "GELD_INVOEREN",
                "data": "#"
            }));
          
            if(GLOBAL.cash_count > 0) {
                GLOBAL.cash_count--;
                GLOBAL.cash_input = GLOBAL.cash_input.substring(0, GLOBAL.cash_input.length-1);
            }
            break;
        case "*":
            // Cash amount must be between 5-100 and must not be empty
            validateIncomingAmount(ws, parseInt(GLOBAL.cash_input));
            break;
        default:
            if(GLOBAL.cash_count < 3) {
                ws.send(JSON.stringify({
                    "type": "GELD_INVOEREN",
                    "data": keypadCharacter
                }));
          
                GLOBAL.cash_count++;
                GLOBAL.cash_input += keypadCharacter;
            } 
    }
}