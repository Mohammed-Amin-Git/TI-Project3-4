import { validateRequest, getCustomerByIBANandUID, getCustomerInfo, updateAttemptsRemaining, blockCardOfCustomer } from './modules/validationFunctions.js';
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();

app.use(cors());

app.get("/api/noob/health", (req, res) => {
	res.json({
		"status": "OK"
	});
});

let customer_attempts_remaining = {};

app.get("/api/accountinfo", async (req, res) => {
	let iban = req.query.iban;
	let pincode = req.query.pincode;
	let uid = req.query.uid;

	try {
		if(!validateRequest(iban, pincode, uid)) {
			res.status(400).json();
		} else {
			// Checking if the customer exists
			const customer = await getCustomerByIBANandUID(iban, uid);
			if(!customer) {
				return res.status(404).json();
			}
	
			// Checking if the card of the customer is blocked
			if(customer.Card_blocked) {
				return res.status(403).json();
			}
	
			// Checking if the pincode of the customer is correct
			const customerInfo = await getCustomerInfo(customer.Customer_ID, pincode);
			if(!customerInfo) {
				customer_attempts_remaining = updateAttemptsRemaining(customer_attempts_remaining, customer.Customer_ID);
				
				if(customer_attempts_remaining[customer.Customer_ID] <= 0) {
					blockCardOfCustomer(customer.Customer_ID);
					return res.status(403).json();
				} else {
					return res.status(401).json({
						attempts_remaining: customer_attempts_remaining[customer.Customer_ID]
					});
				}
			}
	
			// Return user data because authentication was successful
			customer_attempts_remaining[customer.Customer_ID] = 3;
			res.status(200).json(customerInfo);
		}
	} catch(err) {
		res.status(500).json();
		throw err;
	}
});

app.listen(process.env.PORT, () => console.log(`Creating API Server: http://145.24.223.56:${process.env.PORT}`));