const { logger } = require("firebase-functions/v1");
const {
	createNewUser,
	getUserWithEmail,
	getUser,
	getAllUser,
} = require("../services/hyperLedgerFunctions/userAsset");
const User = require("../models/user");

// Create post
const createUser = async (req, res) => {
	try {
		// validate the body
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}

		const { error } = User.validate(req.body);
		if (error) {
			return res.status(400).send(error.details);
		}

		// store in hyperledger
		var result = await createNewUser(req.body);
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

// Get list of users
const getUsers = async (req, res) => {
	try {
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}
		let result;
		if (req.body.Id) {
			result = await getUser(req.body.Id);
		} else {
			result = await getUserWithEmail(req.body.email, req.body.role);
		}

		if (result) {
			return res.status(200).json(result);
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).json("Invalid request");
};

// Get list of posts
const getAllUsers = async (req, res) => {
	try {
		let result;
		result = await getAllUser();

		if (result) {
			return res.status(200).json(result);
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).json("Invalid request");
};

module.exports = { createUser, getUsers, getAllUsers };
