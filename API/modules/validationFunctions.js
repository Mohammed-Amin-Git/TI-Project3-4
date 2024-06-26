import mysql from 'mysql2/promise';
import 'dotenv/config';

// MySQL Config
export const db = mysql.createPool({
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	user: process.env.DB_USERNAME,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_DATABASE
});

// pincode is niet verplicht als parameter
export function validateRequestAccountInfo(iban, uid, pincode) {
	if(!iban || !uid || !iban.match(/[A-Z]{2}[0-9]{2}[A-Z]{4}[0-9]{10}/) || !uid.match(/[0-9A-F]{8}/)) {
		return false;
	}

	if(pincode && !pincode.match(/[0-9]{4}/)) {
		return false;
	}
	
	return true;
}

export function validateRequestWithdraw(iban, uid, pincode, amount) {
	if(
		!iban || !uid || !pincode ||
		!iban.match(/[A-Z]{2}[0-9]{2}[A-Z]{4}[0-9]{10}/) ||
		!uid.match(/[0-9A-F]{8}/) ||
		!pincode.toString().match(/[0-9]{4}/)
	) {
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