import moment from 'moment';
import { GLOBAL, bills } from "../../handleWebSocketConnection.js";
import { countNumber, findCashCombinations } from "../cashModules/cashCombination.js";
import { db } from "../databaseConnectionModule/createDBConnectionViaSSH.js";

export function handleGeldOpnemenRedirect(ws) {
    ws.send(JSON.stringify({
        "type": "REDIRECT",
        "data": "GELD_OPNEMEN"
    }));

    GLOBAL.CLIENT_STATE = "GELD_OPNEMEN";
    GLOBAL.PREVIOUS_MONEY_METHOD = "GELD_OPNEMEN";
}

export function handleGetCashCombinations(ws) {
    db.query("SELECT VijfEuro, TienEuro, VijftigEuro FROM ATM WHERE ATM_ID = 1").then(([rows, fields]) => {
        // Get number of bills in the ATM
        let vijfEuros = rows[0].VijfEuro;
        let tienEuros = rows[0].TienEuro;
        let vijftigEuros = rows[0].VijftigEuro;

        let combinations = findCashCombinations(parseInt(GLOBAL.cash_input), bills, vijfEuros, tienEuros, vijftigEuros).combinations;
      
        if(combinations.length > 0) {
          combinations.sort((a,b) => a.length - b.length); // Sorting the combinations by array length ascending
          if(combinations.length > 3) {
            combinations = combinations.slice(0, 3);
          }

          GLOBAL.cash_combinations = combinations;
          GLOBAL.cash_amount = parseInt(GLOBAL.cash_input);

          ws.send(JSON.stringify({
            "type": "COMBINATIONS",
            "data": combinations,
            "amount": GLOBAL.cash_input
          }));
        } else {
          ws.send(JSON.stringify({
              "type": "ERROR",
              "data": "LOW_ATM_BILLS"
          }));

          ws.send(JSON.stringify({
            "type": "REDIRECT",
            "data": "OPTIONS"
          }));

          GLOBAL.CLIENT_STATE = "OPTIONS";
        }
    });
}

export function handleSelectCashCombinations(ws, port, combination_number) {
    // TODO: Implement NOOB version
    GLOBAL.cash_input = "";
    GLOBAL.cash_count = 0;
    GLOBAL.cash_combination = GLOBAL.cash_combinations[combination_number];

    // TODO: Implement balance using /withdraw eindpoint via noob server
    // Updating the balace in the database
    db.query("SELECT Balance FROM Customer WHERE Customer_ID = ?", [GLOBAL.user_id]).then(([rows, fields]) => {
      let balance = rows[0].Balance;
      let new_balance = balance - GLOBAL.cash_amount;

      db.query("UPDATE Customer SET Balance = ? WHERE Customer_ID = ?", [new_balance, GLOBAL.user_id]);
      console.log("Balance updated!");
    });

    // Updating bill amounts in the database
    let bills5 = countNumber(5, GLOBAL.cash_combination);
    let bills10 = countNumber(10, GLOBAL.cash_combination);
    let bills50 = countNumber(50, GLOBAL.cash_combination);

    db.query("UPDATE ATM SET VijfEuro = VijfEuro - ?, TienEuro = TienEuro - ?, VijftigEuro = VijftigEuro - ? WHERE ATM_ID = 1", [bills5, bills10, bills50]);
    console.log("ATM Updated!");

    // Adding transcation to the database
    GLOBAL.global_current_date = moment().format('YYYY-MM-DD hh:mm:ss');
    db.query("INSERT INTO Transaction (Date, Customer_ID, Transaction_amount) VALUES(?,?,?)", [GLOBAL.global_current_date, GLOBAL.user_id, GLOBAL.cash_amount]);

    // Sending cash_combination array to the microcontroller so that it can be dispensed
    port.write(JSON.stringify({
      "type": "DISPENSE_CASH",
      "cash_combination": GLOBAL.cash_combination
    }));

    ws.send(JSON.stringify({
      "type": "REDIRECT",
      "data": "DISPENSE_WAIT"
    }));
    
    clearTimeout(GLOBAL.SESSION_CONTAINER);
    GLOBAL.CLIENT_STATE = "DISPENSE_WAIT";
}