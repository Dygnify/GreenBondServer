const express = require("express");
const {
	createTransaction,
	getTransaction,
} = require("../controllers/transactionController");

const router = express.Router();

router.post("/createTx", createTransaction);
router.post("/getTx", getTransaction);

module.exports = router;
