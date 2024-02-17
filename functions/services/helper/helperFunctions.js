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

module.exports = {
	getGUID,
	convertTimestampToDate,
};
