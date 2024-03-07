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
	let data = user;
	let action = data.action;
	if (action) {
		delete data.action;
	}
	if (!user.Id) {
		const id = Math.floor(Date.now() / 1000);
		data = {
			Id: id.toString(),
			...data,
			ledgerMetadata: {
				owners: [
					{
						orgId: process.env.SPYDRA_MEMBERSHIP_ID,
						user: user.email,
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
				user.email,
				user.password,
				Role[user.role],
				process.env.DEPLOYED_APP_URL,
				admins
			);
		} else if (action === "ProfileCreation") {
			await createProfile(user.email, Role[user.role], admins);
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
			await completeKyc(companyName, user.email, Role[user.role], admins);
		} else if (action === "PasswordChange") {
			await passwordChanged(
				user.email,
				process.env.DEPLOYED_APP_URL,
				admins
			);
		}
		return { Id: data.Id, ...result.res };
	}
	return result;
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
			getUserWithEmailAndRoleOption(email, role)
		);
		if (result.code === 200) {
			return result.res.data.User;
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
		let result = await axiosHttpService(getUserWithEmailOption(email));
		if (result.code === 200) {
			return result.res.data.User;
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
			return result.res;
		}
		return;
	} catch (error) {
		logger.error(error);
	}
};

const deleteUserOption = (email, role, Id) => {
	if (!email || role === undefined) {
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
		result = await axiosHttpService(
			deleteUserOption(email, role, userResult[0].Id)
		);
		if (result.code === 200) {
			return { success: true };
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

		let options = {
			method: "post",
			maxBodyLength: Infinity,
			url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/tokenize/${process.env.SPYDRA_APP_ID}/graphql`,
			headers: {
				"X-API-KEY": process.env.SPYDRA_API_KEY,
				"Content-Type": "application/json",
			},
			data: data,
		};

		let userResult = await axiosHttpService(options);
		let user = userResult.res.data.User[0];
		console.log(user);
		if (userResult.code !== 200) {
			return { success: false };
		}

		// Generate temporary password
		const temporaryPassword = generateSecurePassword(10);
		console.log("pass", temporaryPassword);

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
			companyName ? companyName : user.email,
			process.env.DEPLOYED_APP_URL,
			user.email,
			temporaryPassword
		);
		// Update backend to show change password when user login
		user.isNewUser = true;
		const result = await createNewUser(user);
		console.log(result);
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
