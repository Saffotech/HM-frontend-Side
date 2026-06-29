/**
 * @typedef {Object} BillItem
 * @property {string} name
 * @property {number} qty
 * @property {number} unitPrice
 */

/**
 * @typedef {Object} PaymentRecord
 * @property {string} date
 * @property {number} amount
 * @property {string} mode
 * @property {string} [ref]
 */

/**
 * @typedef {Object} Bill
 * @property {string} id
 * @property {string} patientId
 * @property {string} patientName
 * @property {string} date
 * @property {BillItem[]} items
 * @property {number} total
 * @property {number} paid
 * @property {number} balance
 * @property {'Paid'|'Partial'|'Unpaid'} status
 * @property {string} [paymentMode]
 * @property {PaymentRecord[]} [payments]
 */

export {};
