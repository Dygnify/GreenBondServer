const { logger } = require("firebase-functions/v1");
const {
	createTokenized,
} = require("../services/hyperLedgerFunctions/tokenizedBond");
const TokenizedBond = require("../models/tokenizedBond");

// Create Transaction
const createTokenizedBond = async (req, res) => {
	try {
		// validate the body
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}

		const { error } = TokenizedBond.validate(req.body);
		if (error) {
			return res.status(400).send(error.details);
		}

		// store in hyperledger
		var result = await createTokenized(req.body);
		if (result.Id) {
			return res.status(201).json(result.Id);
		} else {
			return res.status(result.code).json(result.res);
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).send("Invalid request");
};

module.exports = { createTokenizedBond };
