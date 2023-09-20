const express = require("express");
const { createUser, getUsers } = require("../controllers/userController");

const router = express.Router();

router.post("/createProfile", createUser);
router.post("/getUsers", getUsers);

module.exports = router;
