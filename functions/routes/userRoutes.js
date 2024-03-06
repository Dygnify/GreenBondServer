const express = require("express");
const {
	createUser,
	getUsers,
	getAllUsers,
	getUserAccountStatus,
	enableDisableUserAccount,
	deleteUserAccount,
	forgotUserPassword,
} = require("../controllers/userController");

const router = express.Router();

router.post("/createProfile", createUser);
router.post("/getUsers", getUsers);
router.post("/getAllUsers", getAllUsers);
router.post("/getUserAccountStatus", getUserAccountStatus);
router.post("/enableDisableUserAccount", enableDisableUserAccount);
router.post("/deleteUser", deleteUserAccount);
router.post("/forgotPassword", forgotUserPassword);

module.exports = router;
