const express = require("express");
const {
	createTokenizedBond,
	getTokenizedBond,
} = require("../controllers/tokenizedBondController");

const router = express.Router();

router.post("/createTokenizedBond", createTokenizedBond);
router.post("/getTokenizedBond", getTokenizedBond);

module.exports = router;
