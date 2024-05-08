// Custom modules
import { handleSerialConnection } from "./handleWebSocketConnection/handleSerialConnection.js";
import { handleWebSocketData } from "./handleWebSocketConnection/handleWebSocketData.js";

// NPM modules
import { ReadlineParser } from '@serialport/parser-readline';
import { SerialPort } from 'serialport';


// Configure serial connection to microcontroller
const port = new SerialPort({ path: process.env.SERIAL_PORT, baudRate: 9600 });
const parser = port.pipe(new ReadlineParser());

export const bills = [5, 10, 50];   // Bills used by ATM
export const SESSION_TIME = 120000; // Amount of time the user has during a session (2 min)

// GLOBAL object containing variables used by different modules to keep track of things
export let GLOBAL = {
    CLIENT_STATE: "NULL",
    PREVIOUS_MONEY_METHOD: "NULL",
    
    NOOB_FLAG: false,
    NOOB_USER_PINCODE: null, // Used by NOOB Users
    NOOB_USER_BALANCE: null, // Used by NOOB Users

    SESSION_CONTAINER: null, 

    global_uid: null,  // Used by Normal and NOOB Users
    global_iban: null, // Used by Normal and NOOB Users
    user_id: null,     // Used by Normal Users

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

// Function to handle new WebSocket Connections
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

// Function to perform requests and receive a response to/from the NOOB server
export async function NOOBRequest(method, endpoint, iban, body) {
  // Specify HTTP method, body and headers  
  const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'NOOB-TOKEN': process.env.NOOB_TOKEN
      },
      body: JSON.stringify(body)
    }

    // Exception handling te prevent server crashes
    try {
      // Perform request and parse the response
      const response = await fetch(`https://${process.env.NOOB_HOST}/api/noob/${endpoint}?target=${iban}`, options);
      const status_code = response.status;
      const json = await response.json();

      // Return response
      return {
        status_code: status_code,
        data: json
      };
    } catch(err) {
        console.error(err.stack);
    }
}