const { logger } = require("firebase-functions/v1");
const CryptoJS = require("crypto-js");

function getGUID() {
	return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
		(
			c ^
			(crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
		).toString(16)
	);
}

function convertTimestampToDate(timestamp) {
	let date = new Date(timestamp); // creates a new Date object from the Unix timestamp

	let day = ("0" + date.getDate()).slice(-2); // gets the day and pads with a 0 if necessary
	let month = ("0" + (date.getMonth() + 1)).slice(-2); // gets the month (0-11, so add 1) and pads with a 0 if necessary
	let year = date.getFullYear(); // gets the year

	return day + "/" + month + "/" + year; // returns the date in DD/MM/YYYY format
}

function convertTimestampToDateDashed(timestamp) {
	const date = new Date(timestamp);
	const year = date.getFullYear();
	const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Adding 1 because months are 0-based
	const day = date.getDate().toString().padStart(2, "0");

	const formattedDate = `${year}-${month}-${day}`;
	return formattedDate;
}

function formatCurrency(number) {
	var fNum = parseFloat(number).toFixed(2);
	// Convert number to string
	let numStr = String(fNum);

	// Split the string into integer and decimal parts
	let parts = numStr.split(".");
	let integerPart = parts[0];
	let decimalPart = parts.length > 1 ? "." + parts[1] : "";

	// Add commas to the integer part
	let integerWithCommas = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

	// Concatenate integer and decimal parts
	return integerWithCommas + decimalPart;
}

const encryptionOptions = {
	mode: CryptoJS.mode.CBC,
	padding: CryptoJS.pad.Pkcs7,
};

function encryptData(data) {
	if (!data) {
		return null;
	}
	try {
		const encryptedData = CryptoJS.AES.encrypt(
			data,
			process.env.ENCRYPTION_KEY,
			encryptionOptions
		).toString();
		return encryptedData;
	} catch (error) {
		logger.error(error);
	}
}

function decryptData(encryptedData) {
	if (!encryptedData) {
		return null;
	}
	try {
		const bytes = CryptoJS.AES.decrypt(
			encryptedData,
			process.env.ENCRYPTION_KEY,
			encryptionOptions
		);
		const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

		return decryptedData;
	} catch (error) {
		logger.error(error);
	}
}

const sortObject = (object) => {
	return Object.keys(object)
		.sort()
		.reduce((result, key) => {
			result[key] = object[key];
			return result;
		}, {});
};

const generateHash = (data) => {
	const stringObj = JSON.stringify(data);
	const hash = CryptoJS.SHA256(stringObj);
	const hashString = hash.toString(CryptoJS.enc.Hex);
	return hashString;
};

module.exports = {
	getGUID,
	convertTimestampToDate,
	formatCurrency,
	encryptData,
	decryptData,
	sortObject,
	generateHash,
	convertTimestampToDateDashed,
};
