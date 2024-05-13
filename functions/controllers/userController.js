const { logger } = require("firebase-functions/v1");
const {
	createNewUser,
	getUserWithEmailAndRole,
	getUserWithEmail,
	getUser,
	getAllUser,
	deleteUser,
	forgotPassword,
	getUsersWithRole,
} = require("../services/hyperLedgerFunctions/userAsset");
const User = require("../models/user");
const { getFirebaseAdminAuth } = require("../firebaseInit");

// Create post
const createUser = async (req, res) => {
	logger.info("userController createUser execution started");
	try {
		// validate the body
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}

		const { error } = User.validate(req.body);
		if (error) {
			logger.error("User validation failed: ", error);
			return res.status(400).send(error.details);
		}

		// store in hyperledger
		var result = await createNewUser(req.body);
		if (result.Id) {
			logger.info("User successfuly created with id: ", result.Id);
			return res.status(201).json(result.Id);
		} else {
			logger.error("Failed to create user with response: ", result);
			if (!req.body.Id) {
				await deleteUserInFirebase(req.body.email);
				logger.info("Revert Created user in firebase");
			}
			return res.status(result.code).json(result.res);
		}
	} catch (error) {
		// await deleteUserInFirebase(req.body.email);
		logger.error(error);
	}
	res.status(400).send("Invalid request");
};

// Get list of users
const getUsers = async (req, res) => {
	logger.info("userController getUsers execution started");
	try {
		if (!req.body) {
			logger.error("Request body not available");
			response.status(400).send("Invalid data");
		}
		let result;
		if (req.body.Id) {
			logger.info("Get user with id called, for id: ", req.body.Id);
			result = await getUser(req.body.Id);
		} else if (req.body.role !== undefined && req.body.email) {
			logger.info(
				`Get user with email called, with param email: ${req.body.email} and role: ${req.body.role}`
			);
			result = await getUserWithEmailAndRole(
				req.body.email,
				req.body.role
			);
		} else {
			if (req.body.email) {
				logger.info(
					`Get user with email called, with param email: ${req.body.email}`
				);
				result = await getUserWithEmail(req.body.email);
			} else if (req.body.role !== undefined) {
				logger.info(
					`Get users with role called, with param role: ${req.body.role}`
				);
				result = await getUsersWithRole(req.body.role);
			}
		}

		if (result) {
			logger.info("User found: ", result);
			return res.status(200).json(result);
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).json("Invalid request");
};

// Get list of posts
const getAllUsers = async (req, res) => {
	logger.info("userController getAllUsers execution started");
	try {
		let result;
		result = await getAllUser(req.body?.pageSize, req.body?.bookmark);

		if (result) {
			logger.info("User found: ", result);
			return res.status(200).json(result);
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).json("Invalid request");
};

const getUserAccountStatus = async (req, res) => {
	logger.info("userController getUserAccountStatus execution started");
	try {
		if (!req.body.email) {
			logger.error("User validation failed: email field required");
			return res.status(400).json("Invalid request");
		}
		const auth = getFirebaseAdminAuth();
		const userRecord = await auth.getUserByEmail(req.body.email);
		logger.info(
			`User account status received with email: ${req.body.email}`
		);
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
	logger.info("userController enableDisableUserAccount execution started");
	try {
		if (!req.body.email) {
			logger.error("User validation failed: email field required");
			return res.status(400).json("Invalid request");
		}
		const auth = getFirebaseAdminAuth();
		const userRecord = await auth.getUserByEmail(req.body.email);
		const updatedrecord = await auth.updateUser(userRecord.uid, {
			disabled: !userRecord.disabled,
		});
		if (updatedrecord.disabled !== userRecord.disabled) {
			logger.info(
				`User Account with email: ${req.body.email} is now ${
					updatedrecord.disabled ? "Disabled" : "Enabled"
				}`
			);
			return res.json({
				success: true,
				message: `User Account ${
					updatedrecord.disabled ? "Disabled" : "Enabled"
				}`,
				disabled: updatedrecord.disabled,
			});
		} else {
			logger.error("Failed to change account status!");
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
	logger.info("userController deleteUserAccount execution started");
	try {
		if (!req.body.email || req.body.role === undefined) {
			logger.error("User validation failed");
			return res.status(400).json("Invalid request");
		}
		const result = await deleteUser(req.body.email, req.body.role);
		if (result.success) {
			await deleteUserInFirebase(req.body.email);
			logger.info("Successfully deleted User");
			return res.json({
				success: true,
				message: "Successfully deleted User",
			});
		} else {
			logger.error("Unable to delete User account. Error: ", result);
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

const forgotUserPassword = async (req, res) => {
	logger.info("userController forgotUserPassword execution started");
	try {
		if (!req.body.email) {
			logger.error("User validation failed");
			return res.status(400).json("Invalid request");
		}
		const result = await forgotPassword(req.body.email);
		if (result.success) {
			logger.info("Password reset successful. Response: ", result);
			return res.json({
				...result,
				message: "Password reset successful",
			});
		} else {
			logger.error("Failed to reset password. Response: ", result);
			res.status(400).json({
				success: false,
				message: "Failed to reset password",
			});
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).json("Invalid request");
};

const deleteUserInFirebase = async (email) => {
	const auth = getFirebaseAdminAuth();
	// Get user record from firebase
	const userRecord = await auth.getUserByEmail(email);
	// Delete the user
	await auth.deleteUser(userRecord.uid);
};

module.exports = {
	createUser,
	getUsers,
	getAllUsers,
	getUserAccountStatus,
	enableDisableUserAccount,
	deleteUserAccount,
	forgotUserPassword,
};
