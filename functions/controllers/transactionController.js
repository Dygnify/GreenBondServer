const { logger } = require("firebase-functions/v1");
const {
	createTx,
	getTx,
	getAllTx,
} = require("../services/hyperLedgerFunctions/transaction");
const Transaction = require("../models/transaction");

// Create Transaction
const createTransaction = async (req, res) => {
	logger.info("transactionController createTransaction execution started");
	try {
		// validate the body
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}

		const { error } = Transaction.validate(req.body);
		if (error) {
			logger.error("Transaction validation failed: ", error);
			return res.status(400).send(error.details);
		}

		// store in hyperledger
		var result = await createTx(req.body);
		if (result.Id) {
			logger.info("Transaction successfuly created with id: ", result.Id);
			return res.status(201).json(result.Id);
		} else {
			logger.error("Failed to create Transaction");
			return res.status(result.code).json(result.res);
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).send("Invalid request");
};

// Get list of Tx
const getTransaction = async (req, res) => {
	logger.info("transactionController getTransaction execution started");
	try {
		if (!req.body) {
			logger.error("Request body not available");
			response.status(400).send("Invalid data");
		}

		var result = await getTx(req.body.field, req.body.value);
		if (result) {
			logger.info("Transaction found: ", result);
			return res.status(200).json(result);
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).json("Invalid request");
};

// Get list of all Tx
const getAllTransactions = async (req, res) => {
	logger.info("transactionController getAllTransactions execution started");
	try {
		var result = await getAllTx(req.body?.pageSize, req.body?.bookmark);
		if (result) {
			logger.info("Transaction found: ", result);
			return res.status(200).json(result);
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).json("Invalid request");
};

module.exports = { createTransaction, getTransaction, getAllTransactions };
