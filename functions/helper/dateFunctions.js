const { logger } = require("firebase-functions/v1");

function calculateDateDifferenceInDays(date1, date2) {
	const oneDay = 24 * 60 * 60 * 1000; // hours * minutes * seconds * milliseconds
	try {
		const firstDate = new Date(date1);
		const secondDate = new Date(date2);
		const diffDays = Math.floor(
			Math.abs((firstDate - secondDate) / oneDay)
		);
		return diffDays;
	} catch (error) {
		logger.error(error);
	}
	return undefined;
}

function isDateGreaterThan(date1, date2) {
	try {
		const firstDate = new Date(date1);
		const secondDate = new Date(date2);

		// Compare dates
		if (firstDate > secondDate) {
			return true;
		} else {
			return false;
		}
	} catch (error) {
		logger.error(error);
	}
	return undefined;
}

function getDayFromDate(dateString) {
	try {
		const date = new Date(dateString);
		const day = date.getDate(); // Returns the day of the month (1-31)
		return day;
	} catch (error) {
		logger.error(error);
	}
	return undefined;
}

function addMonthsToDate(dateString, addMonths) {
	try {
		const date = new Date(dateString);
		if (!addMonths || addMonths <= 0) {
			return date;
		}
		if (addMonths < 1) {
			date.setDate(date.getDate() + addMonths * 30);
		} else {
			const currentMonth = date.getMonth();
			date.setMonth(currentMonth + addMonths);
		}
		return date;
	} catch (error) {
		logger.error(error);
	}
	return undefined;
}

// Function to add days to a date
function addDaysToDate(date, days) {
	try {
		var result = new Date(date);
		result.setDate(result.getDate() + days);
		return result;
	} catch (error) {
		logger.error(error);
	}
	return undefined;
}

module.exports = {
	calculateDateDifferenceInDays,
	isDateGreaterThan,
	getDayFromDate,
	addMonthsToDate,
	addDaysToDate,
};
