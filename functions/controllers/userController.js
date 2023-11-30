const { logger } = require("firebase-functions/v1");
const {
	createNewUser,
	getUserWithEmail,
	getUser,
	getAllUser,
	deleteUser,
} = require("../services/hyperLedgerFunctions/userAsset");
const User = require("../models/user");
const { getFirebaseAdminAuth } = require("../firebaseInit");

// Create post
const createUser = async (req, res) => {
	try {
		// validate the body
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}

		const { error } = User.validate(req.body);
		if (error) {
			return res.status(400).send(error.details);
		}

		// store in hyperledger
		var result = await createNewUser(req.body);
		if (result.Id) {
			return res.status(201).json(result.Id);
		} else {
			return res.status(result.code).json(result.res);
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).send("Invalid request");
};

// Get list of users
const getUsers = async (req, res) => {
	try {
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}
		let result;
		if (req.body.Id) {
			result = await getUser(req.body.Id);
		} else {
			result = await getUserWithEmail(req.body.email, req.body.role);
		}

		if (result) {
			return res.status(200).json(result);
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).json("Invalid request");
};

// Get list of posts
const getAllUsers = async (req, res) => {
	try {
		let result;
		result = await getAllUser();

		if (result) {
			return res.status(200).json(result);
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).json("Invalid request");
};

const getUserAccountStatus = async (req, res) => {
	try {
		if (!req.body.email) {
			return res.status(400).json("Invalid request");
		}
		const auth = getFirebaseAdminAuth();
		const userRecord = await auth.getUserByEmail(req.body.email);
		return res.json({
			success: true,
			disabled: userRecord.disabled,
		});
	} catch (error) {
		logger.error(error);
	}
	res.status(400).json("Invalid request");
};

const enableDisableUserAccount = async (req, res) => {
	try {
		if (!req.body.email) {
			return res.status(400).json("Invalid request");
		}
		const auth = getFirebaseAdminAuth();
		const userRecord = await auth.getUserByEmail(req.body.email);
		const updatedrecord = await auth.updateUser(userRecord.uid, {
			disabled: !userRecord.disabled,
		});
		if (updatedrecord.disabled !== userRecord.disabled) {
			return res.json({
				success: true,
				message: `User Account ${
					updatedrecord.disabled ? "Disabled" : "Enabled"
				}`,
				disabled: updatedrecord.disabled,
			});
		} else {
			return res.json({
				success: false,
				message: "Failed to change account status!",
			});
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).json("Invalid request");
};

const deleteUserAccount = async (req, res) => {
	try {
		if (!req.body.email || !req.body.role) {
			return res.status(400).json("Invalid request");
		}
		const result = await deleteUser(req.body.email, req.body.role);
		if (result.success) {
			const auth = getFirebaseAdminAuth();
			// Get user record from firebase
			const userRecord = await auth.getUserByEmail(req.body.email);
			// Delete the user
			console.log("userRecord", userRecord);
			await auth.deleteUser(userRecord.uid);
			return res.json({
				success: true,
				message: "Successfully deleted User",
			});
		} else {
			res.status(400).json({
				success: false,
				message: "Unable to delete User account",
			});
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).json("Invalid request");
};

module.exports = {
	createUser,
	getUsers,
	getAllUsers,
	getUserAccountStatus,
	enableDisableUserAccount,
	deleteUserAccount,
};
