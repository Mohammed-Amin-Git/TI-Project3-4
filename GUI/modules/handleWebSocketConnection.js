import { ReadlineParser } from '@serialport/parser-readline';
import { SerialPort } from 'serialport';
import { handleSerialConnection } from "./handleSerialConnection.js";
import { handleWebSocketData } from "./handleWebSocketData.js";

// SerialPort Config
const port = new SerialPort({ path: process.env.SERIAL_PORT, baudRate: 9600 });
const parser = port.pipe(new ReadlineParser());

export const bills = [5, 10, 50];

export let global_vars = {
    CLIENT_STATE: "NULL",

    global_uid: null,
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

    global_vars.CLIENT_STATE = "SCAN_CARD";

    // Handle Incoming Serial data
    parser.on('data', data => {
      handleSerialConnection(ws, data);
    });

    // Handle Incoming WebSockets Data
    ws.on('message', data => {
      handleWebSocketData(ws, data, port);
    });
}