const express = require("express");
const {
	createUser,
	getUsers,
	getAllUsers,
} = require("../controllers/userController");

const router = express.Router();

router.post("/createProfile", createUser);
router.post("/getUsers", getUsers);
router.post("/getAllUsers", getAllUsers);

module.exports = router;
