const express = require("express");
const {
	createTransaction,
	getTransaction,
	getAllTransactions,
} = require("../controllers/transactionController");

const router = express.Router();

router.post("/createTx", createTransaction);
router.post("/getTx", getTransaction);
router.post("/getAllTx", getAllTransactions);

module.exports = router;
