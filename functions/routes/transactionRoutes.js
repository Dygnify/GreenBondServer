const express = require("express");
const {
	createTransaction,
	getTransactionByBondId,
} = require("../controllers/transactionController");

const router = express.Router();

router.post("/createTx", createTransaction);
router.post("/getTxByBondId", getTransactionByBondId);

module.exports = router;
