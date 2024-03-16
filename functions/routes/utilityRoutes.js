const express = require("express");
const { getStorageFileSignedURL } = require("../controllers/utilityController");

const router = express.Router();

router.get("/getStorageFileSignedURL", getStorageFileSignedURL);

module.exports = router;
