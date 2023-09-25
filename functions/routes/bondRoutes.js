const express = require("express");
const {
	createBond,
	getBonds,
	getAllBonds,
} = require("../controllers/greenBondController");

const router = express.Router();

router.post("/createBond", createBond);
router.post("/getBond", getBonds);
router.post("/getAllBonds", getAllBonds);

module.exports = router;
