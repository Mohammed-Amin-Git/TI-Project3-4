import { db } from "./createDBConnectionViaSSH.js";

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
			attempts[customer_id] -= 1;
		}
	} else {
		attempts[customer_id] = 2;
	}

	return attempts;
}