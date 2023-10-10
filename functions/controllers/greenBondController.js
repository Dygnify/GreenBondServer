const { logger } = require("firebase-functions/v1");
const {
	createGreenBond,
	getGreenBond,
	getAllGreenBonds,
} = require("../services/hyperLedgerFunctions/greenBond");
const GreenBond = require("../models/greenBond");

// Create bond
const createBond = async (req, res) => {
	try {
		// validate the body
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}

		const { error } = GreenBond.validate(req.body);
		if (error) {
			return res.status(400).send(error.details);
		}

		// store in hyperledger
		var result = await createGreenBond(req.body);
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

// Get list of bonds for an user
const getBonds = async (req, res) => {
	try {
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}

		var result = await getGreenBond(req.body);
		if (result) {
			return res.status(200).json(result);
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).json("Invalid request");
};

// Get list of all bonds
const getAllBonds = async (req, res) => {
	try {
		var result = await getAllGreenBonds();
		if (result) {
			return res.status(200).json(result);
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).json("Invalid request");
};

module.exports = { createBond, getBonds, getAllBonds };
