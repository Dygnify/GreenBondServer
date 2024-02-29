const { logger } = require("firebase-functions/v1");
const { axiosHttpService } = require("../axioscall");
const {
	userRegistration,
	createProfile,
	completeKyc,
} = require("../emailHelper");

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
		if (!user.Id) {
			await userRegistration(
				user.email,
				user.password,
				Role[user.role],
				"https://green-bond-app.vercel.app"
			);
		} else if (action === "ProfileCreation") {
			await createProfile(user.email, Role[user.role]);
		} else if (action === "kyc") {
			await completeKyc(user.email, Role[user.role]);
		}
		return { Id: data.Id, ...result.res };
	}
	return result;
};

const getUserWithEmailOption = (email, role) => {
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

const getUserWithEmail = async (email, role) => {
	logger.log(email, role);
	if (!email || role === undefined) {
		return;
	}
	try {
		let result = await axiosHttpService(
			getUserWithEmailOption(email, role)
		);
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
		let userResult = await getUserWithEmail(email, role);
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

module.exports = {
	createNewUser,
	getUserWithEmail,
	getUser,
	getAllUser,
	deleteUser,
};
