const { logger } = require("firebase-functions/v1");
const {
	createNft: createNftFunction,
	getNft: getNftFunction,
	burnNft: burnNftFunction,
} = require("../services/hyperLedgerFunctions/nft");
const Nft = require("../models/nft");

// Create bond
const createNft = async (req, res) => {
	try {
		// validate the body
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}

		const { error } = Nft.validate(req.body);
		if (error) {
			return res.status(400).send(error.details);
		}

		// store in hyperledger
		var result = await createNftFunction(req.body);
		if (result.success) {
			return res
				.status(200)
				.json({ success: result.success, ...result.res });
		} else {
			return res
				.status(result.code)
				.json({ success: result.success, ...result.res });
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).send("Invalid request");
};

// Get list of bonds for an user
const getNft = async (req, res) => {
	try {
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}

		var result = await getNftFunction(req.body);
		if (result.success) {
			return res
				.status(200)
				.json({ success: result.success, ...result.res });
		} else {
			return res
				.status(result.code)
				.json({ success: result.success, ...result.res });
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).json("Invalid request");
};

const burnNft = async (req, res) => {
	try {
		// validate the body
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}

		const { error } = Nft.validate(req.body);
		if (error) {
			return res.status(400).send(error.details);
		}

		// store in hyperledger
		var result = await burnNftFunction(req.body);
		if (result.success) {
			return res
				.status(200)
				.json({ success: result.success, ...result.res });
		} else {
			return res
				.status(result.code)
				.json({ success: result.success, ...result.res });
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).send("Invalid request");
};

module.exports = { createNft, getNft, burnNft };
