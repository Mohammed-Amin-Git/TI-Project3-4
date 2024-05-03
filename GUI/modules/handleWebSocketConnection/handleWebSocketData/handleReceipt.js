import { GLOBAL } from "../../handleWebSocketConnection.js";
import { cashCombinationArrayToString, formatIBAN, obfuscateIBAN } from "../cashModules/cashCombination.js";
import { db } from "../databaseConnectionModule/createDBConnectionViaSSH.js";

export function handlePrintReceipt(ws, port, receipt_option) {
    if(receipt_option) {
        // Sending data to the microcontroller so that it can print a receipt
        db.query("SELECT MAX(Transaction.Transaction_ID) AS Transcation_ID, Customer.IBAN FROM Transaction INNER JOIN Customer ON Transaction.Customer_ID = Customer.Customer_ID WHERE Customer.Customer_ID = ?;", [GLOBAL.user_id]).then(([rows, fields]) => {
          port.write(JSON.stringify({
            "type": "PRINT_RECEIPT",
            "date": GLOBAL.global_current_date,
            "amount": GLOBAL.cash_amount.toString(),
            "combination": cashCombinationArrayToString(GLOBAL.cash_combination),
            "iban": obfuscateIBAN(formatIBAN(rows[0].IBAN)),
            "transaction_id": rows[0].Transcation_ID.toString()
          }));
        });

        ws.send(JSON.stringify({
          "type": "REDIRECT",
          "data": "RECEIPT_WAIT"
        }));

        GLOBAL.CLIENT_STATE = "RECEIPT_WAIT";
      } else {
        ws.send(JSON.stringify({
          "type": "REDIRECT",
          "data": "SCAN_CARD"
        }));

        ws.send(JSON.stringify({
          "type": "SUCCESS",
          "data": "TRANSACTION_SUCCESS"
        }));

        GLOBAL.CLIENT_STATE = "SCAN_CARD";
      }
}

export function handleTransaction(ws) {
    ws.send(JSON.stringify({
        "type": "REDIRECT",
        "data": "TRANSACTION"
    }));

    GLOBAL.CLIENT_STATE = "TRANSACTION";

    db.query("SELECT Transaction_ID, Date, Transaction_amount FROM Transaction WHERE Customer_ID = ? ORDER BY Transaction_ID DESC", [GLOBAL.user_id]).then(([rows, fields]) => {
        ws.send(JSON.stringify({
          "type": "TRANSACTIONS",
          "transactions": rows
        }));
    });
}