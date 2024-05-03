import { GLOBAL } from "../../handleWebSocketConnection.js";

export function handleUitloggen(ws) {
    ws.send(JSON.stringify({
        "type": "REDIRECT",
        "data": "SCAN_CARD"
    }));

    clearTimeout(GLOBAL.SESSION_CONTAINER);

    GLOBAL.user_id = null;
    GLOBAL.CLIENT_STATE = "SCAN_CARD";
}

export function handleBack(ws) {
    if(GLOBAL.CLIENT_STATE == "GET_INFO" || GLOBAL.CLIENT_STATE == "GELD_OPNEMEN" || GLOBAL.CLIENT_STATE == "SNELPINNEN") {
        ws.send(JSON.stringify({
          "type": "REDIRECT",
          "data": "OPTIONS"
        }));

        GLOBAL.cash_input = "";
        GLOBAL.cash_count = 0;
        GLOBAL.CLIENT_STATE = "OPTIONS";
    } else if(GLOBAL.CLIENT_STATE == "CASH_COMBINATION") {
        GLOBAL.cash_input = "";
        GLOBAL.cash_count = 0;
        
        console.log(GLOBAL.PREVIOUS_MONEY_METHOD);

        if(GLOBAL.PREVIOUS_MONEY_METHOD == "GELD_OPNEMEN") {
          ws.send(JSON.stringify({
            "type": "REDIRECT",
            "data": "GELD_OPNEMEN"
          }));
          
          GLOBAL.CLIENT_STATE = "GELD_OPNEMEN";
        } else if(GLOBAL.PREVIOUS_MONEY_METHOD == "SNELPINNEN") {
          ws.send(JSON.stringify({
            "type": "REDIRECT",
            "data": "SNELPINNEN"
          }));
          GLOBAL.CLIENT_STATE = "SNELPINNEN";
        }
    } else if(GLOBAL.CLIENT_STATE == "TRANSACTION") {
        ws.send(JSON.stringify({
          "type": "REDIRECT",
          "data": "OPTIONS"
        }));

        GLOBAL.CLIENT_STATE = "OPTIONS";
    }
}