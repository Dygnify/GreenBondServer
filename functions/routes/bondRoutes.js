const express = require("express");
const {
	createBond,
	getBonds,
	getAllBonds,
	voteOpportunity,
} = require("../controllers/greenBondController");

const router = express.Router();

router.post("/createBond", createBond);
router.post("/getBond", getBonds);
router.post("/getAllBonds", getAllBonds);
router.post("/vote", voteOpportunity);

module.exports = router;
