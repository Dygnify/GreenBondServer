const { body, validationResult } = require("express-validator");
const { logger } = require("firebase-functions");

// Middleware to sanitize user input
const sanitizeInput = [
	// Sanitize the input fields using express-validator
	// body('inputFieldName').escape(), //Replace 'inputFieldName' with the name of the input field you want to sanitize.
	// Add more input fields to sanitize as needed

	// Process validation errors
	(req, res, next) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			// If there are validation errors, return a response with the errors
			logger.error("Malicious input detected. Errors: ", errors);
			return res.status(400).json({ errors: errors.array() });
		}
		// If input is sanitized and validated, proceed to the next middleware
		next();
	},
];

module.exports = sanitizeInput;
