const express = require("express");
const {
	createBond,
	getBonds,
	getAllBonds,
	voteForBond,
} = require("../controllers/greenBondController");

const router = express.Router();

router.post("/createBond", createBond);
router.post("/getBond", getBonds);
router.post("/getAllBonds", getAllBonds);
router.post("/vote", voteForBond);

module.exports = router;
