const { SerialPort } = require('serialport');

const express = require('express');
const app = express();

// const port = new SerialPort({
//     path: "COM5",
//     baudRate: 9600
// });

// port.on('data', (data) => {
//     console.log("Data: ", data.toString());
// });

app.use(express.static("public"));

app.listen(80, () => {
    console.log("Listening at port 80");
});