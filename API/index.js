const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

app.listen(8080, () => {
	console.log("Creating API Server: http://145.24.223.56:8080");
});

app.get("/api/noob/health", (req, res) => {
	res.json({
		"status": "OK"
	});
});

app.get("/api/accountinfo", (req, res) => {
	let iban = req.query.iban;
	let pincode = req.query.iban;
	let uid = req.query.iban;

	if(!iban || !pincode || !uid) {
		res.status(400).json();
	}
});
