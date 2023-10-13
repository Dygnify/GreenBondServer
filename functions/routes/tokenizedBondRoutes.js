const express = require("express");
const {
	createTokenizedBond,
} = require("../controllers/tokenizedBondController");

const router = express.Router();

router.post("/createTokenizedBond", createTokenizedBond);

module.exports = router;
