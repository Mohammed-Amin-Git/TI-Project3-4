import {
	validateRequestAccountInfo,
	getCustomerByIBANandUID,
	getCustomerInfo,
	updateAttemptsRemaining,
	blockCardOfCustomer,
	validateRequestWithdraw
} from './modules/validationFunctions.js';
import { updateCustomerBalance } from './modules/updateCustomerBalance.js';
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();

app.use(express.json());
app.use(cors());

app.use((err, req, res, next) => {
	if (err) {
		return res.status(500).json({});
	}

	next();
});

app.get("/api/noob/health", (req, res) => {
	res.json({
		"status": "OK"
	});
});

let customer_attempts_remaining = {};

app.post("/api/accountinfo", async (req, res) => {
	const target = req.body.target;
	const pincode = req.body.pincode;
	const uid = req.body.uid;

	try {
		if(!validateRequestAccountInfo(target, uid)) {
			return res.status(400).json({});
		}

		// Checking if the customer exists
		const customer = await getCustomerByIBANandUID(target, uid);
		if(!customer) {
			return res.status(404).json({});
		}

		// Checking if the card of the customer is blocked
		if(customer.Card_blocked) {
			return res.status(403).json({});
		}

		// Checking if the pincode of the customer is correct
		const customerInfo = await getCustomerInfo(customer.Customer_ID, pincode);
		if(!customerInfo) {
			customer_attempts_remaining = updateAttemptsRemaining(customer_attempts_remaining, customer.Customer_ID);

			if(customer_attempts_remaining[customer.Customer_ID] <= 0) {
				blockCardOfCustomer(customer.Customer_ID);
				customer_attempts_remaining[customer.customer_ID] = 3;
				return res.status(403).json({});
			} else {
				return res.status(401).json({
					attempts_remaining: customer_attempts_remaining[customer.Customer_ID]
				});
			}
		}

		// Return user data because authentication was successful
		customer_attempts_remaining[customer.Customer_ID] = 3;
		res.status(200).json(customerInfo);
	} catch(err) {
		res.status(500).json({});
		console.error(err.stack);
	}
});

app.post("/api/withdraw", async (req, res) => {
	const target = req.body.target;
	const uid = req.body.uid;
	const pincode = req.body.pincode;
	const amount = req.body.amount;

	try {
		if(!validateRequestWithdraw(target, uid, pincode, amount)) {
			return res.status(400).json({});
		}

		// Checking if the customer exists
		const customer = await getCustomerByIBANandUID(target, uid);
		if(!customer) {
			return res.status(404).json({});
		}

		// Checking if the card of the customer is blocked
		if(customer.Card_blocked) {
			return res.status(403).json({});
		}

		// Checking if the pincode of the customer is correct
		const customerInfo = await getCustomerInfo(customer.Customer_ID, pincode);
		if(!customerInfo) {
			customer_attempts_remaining = updateAttemptsRemaining(customer_attempts_remaining, customer.Customer_ID);

			if(customer_attempts_remaining[customer.Customer_ID] <= 0) {
				blockCardOfCustomer(customer.Customer_ID);
				return res.status(403).json({});
			} else {
				return res.status(401).json({
					attempts_remaining: customer_attempts_remaining[customer.Customer_ID]
				});
			}
		}

		// Return user data because authentication was successful
		customer_attempts_remaining[customer.Customer_ID] = 3;

		if(customerInfo.Balance >= amount) {
			// TODO: Update customer balance
			updateCustomerBalance(customer.Customer_ID, amount);
			res.status(200).json({});
		} else {
			res.status(412).json({});
		}
	} catch(err) {
		res.status(500).json({});
		console.error(err.stack);
	}


});

app.listen(process.env.PORT, () => console.log(`Creating API Server: http://145.24.223.56:${process.env.PORT}`));
