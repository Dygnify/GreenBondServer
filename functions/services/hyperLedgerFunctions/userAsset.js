const { logger } = require("firebase-functions/v1");
const { axiosHttpService } = require("../axioscall");
const {
	userRegistration,
	createProfile,
	completeKyc,
	passwordChanged,
	resetPasswordMail,
	updateProfile,
} = require("../emailHelper");
const crypto = require("crypto");
const { getFirebaseAdminAuth } = require("../../firebaseInit");
const uuid = require("uuid");
const { encryptData, decryptData } = require("../helper/helperFunctions");

const Role = [
	"Subscriber",
	"Issuer",
	"Custodian",
	"Regulator",
	"Admin",
	"Diligence",
];

const createUserOption = (user) => {
	if (!user) {
		return;
	}

	let data = JSON.stringify({
		assetType: "User",
		data: [user],
	});

	return {
		method: "put",
		maxBodyLength: Infinity,
		url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/tokenize/${process.env.SPYDRA_APP_ID}/asset`,
		headers: {
			"Content-Type": "application/json",
			"X-API-KEY": process.env.SPYDRA_API_KEY,
		},
		data: data,
	};
};

const createNewUser = async (user) => {
	if (!user) {
		return;
	}
	let data = { ...user };
	data.email = data.email.toLowerCase();
	if (data.profile) {
		data.profile = encryptData(data.profile);
	}

	let action = data.action;
	if (action) {
		delete data.action;
	}
	let temporaryPassword;
	if (!user.Id) {
		// Generate temporary password
		temporaryPassword = generateSecurePassword(10);

		// Create user in firebase
		const auth = getFirebaseAdminAuth();
		const userRecord = await auth.createUser({
			email: data.email,
			password: temporaryPassword,
		});

		logger.log(
			"Successfully created new user in firebase:",
			userRecord.uid
		);

		const id = uuid.v4();
		data = {
			Id: id.toString(),
			...data,
			ledgerMetadata: {
				owners: [
					{
						orgId: process.env.SPYDRA_MEMBERSHIP_ID,
						user: data.email,
					},
				],
			},
		};
	}
	let result = await axiosHttpService(createUserOption(data));
	if (result.code === 201) {
		// Get admins
		let admins = [];
		const adminResult = await getAllUser();

		adminResult.records.forEach((user) => {
			if (user.data.role === 4) {
				admins.push(user.data.email);
			}
		});

		if (!user.Id) {
			await userRegistration(
				"User",
				user.email,
				temporaryPassword,
				Role[user.role],
				process.env.DEPLOYED_APP_URL,
				admins
			);
		} else if (action === "ProfileCreation") {
			await createProfile("User", user.email, Role[user.role], admins);
		} else if (action === "ProfileUpdate") {
			const profile = JSON.parse(user.profile);
			const companyName = profile?.companyName;
			await updateProfile(
				companyName ? companyName : "User",
				user.email,
				Role[user.role],
				admins
			);
		} else if (action === "kyc") {
			const profile = JSON.parse(user.profile);
			const companyName = profile.companyName;
			await completeKyc(
				companyName ? companyName : "User",
				user.email,
				Role[user.role],
				admins
			);
		} else if (action === "PasswordChange") {
			const profile = JSON.parse(user.profile);
			const companyName = profile.companyName;
			await passwordChanged(
				companyName ? companyName : "User",
				user.email,
				process.env.DEPLOYED_APP_URL
			);
		}
		return { Id: data.Id, ...result.res };
	}
	return result;
};

const getDecryptedUser = (user) => {
	if (!user) {
		return;
	}
	try {
		if (user.profile !== "{}") {
			user.profile = decryptData(user.profile);
		}
		return user;
	} catch (error) {
		logger.error(error);
	}
};

const getUserWithEmailAndRoleOption = (email, role) => {
	if (!email || role === undefined) {
		return;
	}
	logger.log(email, role);
	let data = JSON.stringify({
		query: `{
          User(email: "${email}", role: ${role}){
              Id,
              email,
              profile,
              role,
			  kycStatus, 
			  isNewUser
              ledgerMetadata{
                owners
              }
      }}`,
	});

	return {
		method: "post",
		maxBodyLength: Infinity,
		url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/tokenize/${process.env.SPYDRA_APP_ID}/graphql`,
		headers: {
			"X-API-KEY": process.env.SPYDRA_API_KEY,
			"Content-Type": "application/json",
		},
		data: data,
	};
};

const getUserWithEmailAndRole = async (email, role) => {
	logger.log(email, role);
	if (!email || role === undefined) {
		return;
	}
	try {
		let result = await axiosHttpService(
			getUserWithEmailAndRoleOption(email.toLowerCase(), role)
		);
		if (result.code === 200) {
			return getDecryptedUser(result.res.data.User[0]);
		}
		return;
	} catch (error) {
		logger.error(error);
	}
};

const getUserWithEmailOption = (email) => {
	if (!email) {
		return;
	}
	logger.log(email);
	let data = JSON.stringify({
		query: `{
          User(email: "${email}"){
              Id,
              email,
              profile,
              role,
			  kycStatus, 
			  isNewUser
      }}`,
	});

	return {
		method: "post",
		maxBodyLength: Infinity,
		url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/tokenize/${process.env.SPYDRA_APP_ID}/graphql`,
		headers: {
			"X-API-KEY": process.env.SPYDRA_API_KEY,
			"Content-Type": "application/json",
		},
		data: data,
	};
};

const getUserWithEmail = async (email) => {
	logger.log(email);
	if (!email) {
		return;
	}
	try {
		let result = await axiosHttpService(
			getUserWithEmailOption(email.toLowerCase())
		);
		if (result.code === 200) {
			return getDecryptedUser(result.res.data.User[0]);
		}
		return;
	} catch (error) {
		logger.error(error);
	}
};

const getUserOption = (Id) => {
	if (!Id) {
		return;
	}
	logger.log(Id);

	return {
		method: "get",
		url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/tokenize/${process.env.SPYDRA_APP_ID}/asset?assetType=User&id=${Id}`,
		headers: {
			"X-API-KEY": process.env.SPYDRA_API_KEY,
		},
	};
};

const getUser = async (Id) => {
	logger.log(Id);
	if (!Id) {
		return;
	}
	try {
		let result = await axiosHttpService(getUserOption(Id));
		if (result.code === 200) {
			result.res.data = getDecryptedUser(result.res.data);
			return result.res;
		}
		return;
	} catch (error) {
		logger.error(error);
	}
};

const getAllUserOption = (pageSize, bookmark) => {
	return {
		method: "get",
		url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/tokenize/${
			process.env.SPYDRA_APP_ID
		}/asset/all?assetType=User&pageSize=${pageSize}${
			bookmark ? `&bookmark=${bookmark}` : ""
		}`,
		headers: {
			"X-API-KEY": process.env.SPYDRA_API_KEY,
		},
	};
};

const getAllUser = async (pageSize = 500, bookmark) => {
	try {
		let result = await axiosHttpService(
			getAllUserOption(pageSize, bookmark)
		);
		if (result.code === 200) {
			if (result.res.count) {
				result.res.records = result.res.records.map((element) => {
					if (element.data.profile !== "{}") {
						element.data.profile = decryptData(
							element.data.profile
						);
					}
					return element;
				});
			}
			return result.res;
		}
		return;
	} catch (error) {
		logger.error(error);
	}
};

const deleteUserOption = (Id) => {
	if (!Id) {
		return;
	}

	let data = JSON.stringify({
		assetType: "User",
		id: [Id],
	});

	return {
		method: "delete",
		maxBodyLength: Infinity,
		url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/tokenize/${process.env.SPYDRA_APP_ID}/asset`,
		headers: {
			accept: "application/json",
			"X-API-KEY": process.env.SPYDRA_API_KEY,
			"Content-Type": "application/json",
		},
		data: data,
	};
};

const deleteUser = async (email, role) => {
	try {
		if (!email || role === undefined) {
			return;
		}
		let userResult = await getUserWithEmailAndRole(email, role);
		if (userResult) {
			result = await axiosHttpService(deleteUserOption(userResult.Id));
			if (result.code === 200) {
				return { success: true };
			}
		}
		return { success: false };
	} catch (error) {
		logger.error(error);
		return { success: false };
	}
};

const forgotPassword = async (email) => {
	try {
		if (!email) {
			return;
		}

		// Get Id of user
		let userResult = await getUserWithEmail(email);
		if (!userResult || userResult.length <= 0) {
			return { success: false };
		}

		let user = userResult[0];

		// Generate temporary password
		const temporaryPassword = generateSecurePassword(10);

		// Change password
		const auth = getFirebaseAdminAuth();
		const userRecord = await auth.getUserByEmail(email);
		await auth.updateUser(userRecord.uid, {
			password: temporaryPassword,
		});

		// Get profile name
		const profile = JSON.parse(user.profile);
		const companyName = profile?.companyName;

		// Send Email with temporary password
		await resetPasswordMail(
			companyName ? companyName : "User",
			process.env.DEPLOYED_APP_URL,
			user.email,
			temporaryPassword
		);
		// Update backend to show change password when user login
		user.isNewUser = true;
		const result = await createNewUser(user);
		if (!result.Id) {
			return { success: false };
		}
		return { success: true };
	} catch (error) {
		logger.error(error);
		return { success: false };
	}
};

function generateSecurePassword(length) {
	// Define the character pool for the password
	const characterPool =
		"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";

	// Initialize an empty password string
	let password = "";

	// Generate random characters from the pool
	for (let i = 0; i < length; i++) {
		// Use `crypto.randomInt` to generate cryptographically secure random number as charset index
		const charsetLength = characterPool.length;
		const randomIndex = crypto.randomInt(charsetLength);
		password += characterPool[randomIndex];
	}

	return password;
}

module.exports = {
	createNewUser,
	getUserWithEmailAndRole,
	getUserWithEmail,
	getUser,
	getAllUser,
	deleteUser,
	forgotPassword,
};
