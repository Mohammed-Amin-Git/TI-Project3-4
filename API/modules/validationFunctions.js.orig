<<<<<<< HEAD
import { db } from "./createDBConnectionViaSSH.js";
=======
import mysql from 'mysql2/promise';
import 'dotenv/config';

// MySQL Config
const db = mysql.createPool({
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	user: process.env.DB_USERNAME,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_DATABASE
});

>>>>>>> 5337c10626e2efacbf4d48514e09b2fab20e83d4

export function validateRequest(iban, pincode, uid) {
	if(!iban || !pincode || !uid) {
		return false;
	}
	
	return true;
}

export async function getCustomerByIBANandUID(iban, uid) {
	const sql = "SELECT Customer_ID, Card_blocked FROM Customer WHERE IBAN = ? AND Pass_number = ?";
	const [rows, fields] = await db.query(sql, [iban, uid]);
	return rows.length > 0 ? rows[0] : null;
}

export async function getCustomerInfo(customer_id, pincode) {
	const sql = "SELECT Firstname, Lastname, Balance FROM Customer WHERE Customer_ID = ? AND Pincode = ?";
	const [rows, fields] = await db.query(sql, [customer_id, pincode]);
	return rows.length > 0 ? rows[0] : null;
}

export function blockCardOfCustomer(customer_id) {
	const sql = "UPDATE Customer SET Card_blocked = 1 WHERE Customer_ID = ?";
	db.query(sql, [customer_id]);
}

export function updateAttemptsRemaining(attempts, customer_id) {
	if(Object.keys(attempts).includes(customer_id.toString())) {
		if(attempts[customer_id] > 0) {
<<<<<<< HEAD
			attempts[customer_id] -= 1;
=======
			attempts[customer_id] = attempts[customer_id] - 1;
>>>>>>> 5337c10626e2efacbf4d48514e09b2fab20e83d4
		}
	} else {
		attempts[customer_id] = 2;
	}

	return attempts;
}