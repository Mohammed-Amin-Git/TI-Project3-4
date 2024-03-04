const express_formidable = require('express-formidable');
const express = require('express');
const app = express();

const cookie_parser = require('cookie-parser');

// const { SerialPort } = require('serialport');
// const port = new SerialPort({
//     path: "COM5",
//     baudRate: 9600
// });

// // SerialPort
// port.on('data', (data) => {
//     // data
// });

// Express
app.use(express.static("public"));
app.use(express_formidable);
app.use(cookie_parser);

app.listen(80, () => {
    console.log("Creating Server: http://127.0.0.1/");
});