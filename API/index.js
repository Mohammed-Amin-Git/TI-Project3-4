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
