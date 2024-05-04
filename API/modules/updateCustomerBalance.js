import { db } from './validationFunctions.js';

export function updateCustomerBalance(customer_id, amount) {
	db.query("UPDATE Customer SET Balance = Balance - ? WHERE Customer_ID = ?", [amount, customer_id]);
}
