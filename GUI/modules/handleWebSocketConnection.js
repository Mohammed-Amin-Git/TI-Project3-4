import { ReadlineParser } from '@serialport/parser-readline';
import { SerialPort } from 'serialport';
import { handleSerialConnection } from "./handleWebSocketConnection/handleSerialConnection.js";
import { handleWebSocketData } from "./handleWebSocketConnection/handleWebSocketData.js";

// SerialPort Config
const port = new SerialPort({ path: process.env.SERIAL_PORT, baudRate: 9600 });
const parser = port.pipe(new ReadlineParser());

export const bills = [5, 10, 50];
export const SESSION_TIME = 120000; // 2 min

export let GLOBAL = {
    CLIENT_STATE: "NULL",
    PREVIOUS_MONEY_METHOD: "NULL",
    
    NOOB_FLAG: false,
    NOOB_USER_PINCODE: null,

    SESSION_CONTAINER: null,

    global_uid: null,
    global_iban: null,
    user_id: null,

    pincode_count: 0,
    pincode_error_count: 0,
    pincode_input: "",

    cash_input: "",
    cash_count: 0,

    cash_combinations: null,
    cash_combination: null,
    cash_amount: null,

    global_current_date: null
};

export function handleWebSocketConnection(ws) {
    console.log("Client connection established!");

    GLOBAL.CLIENT_STATE = "SCAN_CARD";

    // Handle Incoming Serial data
    parser.on('data', data => {
      handleSerialConnection(ws, data, port);
    });

    // Handle Incoming WebSockets Data
    ws.on('message', data => {
      handleWebSocketData(ws, data, port);
    });
}

export async function NOOBRequest(method, endpoint, iban, body) {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'NOOB-TOKEN': process.env.NOOB_TOKEN
      },
      body: JSON.stringify(body)
    }

    try {
      const response = await fetch(`https://${process.env.NOOB_HOST}/api/noob/${endpoint}?target=${iban}`, options);
      const status_code = response.status;
      // const json = await response.text();
      const json = await response.json();

      return {
        status_code: status_code,
        data: json
      };
    } catch(err) {
        console.error(err.stack);
    }
}