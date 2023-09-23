const express = require("express");
const { createBond, getBonds } = require("../controllers/greenBondController");

const router = express.Router();

router.post("/createBond", createBond);
router.post("/getBond", getBonds);

module.exports = router;
