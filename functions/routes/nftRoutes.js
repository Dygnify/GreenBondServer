const express = require("express");
const { createNft, getNft, burnNft } = require("../controllers/nftController");

const router = express.Router();

router.post("/createNft", createNft);
router.post("/getNft", getNft);
router.post("/burnNft", burnNft);

module.exports = router;
