const express = require("express");
const postController = require("../controllers/postController");

const router = express.Router();

router.post("/createProfile", postController.createPost);

module.exports = router;
