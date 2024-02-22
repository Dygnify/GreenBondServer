const express = require("express");
const {
	createNft,
	getNft,
	burnNft,
	webhook,
} = require("../controllers/nftController");

const router = express.Router();

router.post("/createNft", createNft);
router.post("/getNft", getNft);
router.post("/burnNft", burnNft);
router.post("/webhook", webhook);

module.exports = router;
