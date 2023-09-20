const { axiosHttpService } = require("../axioscall");

const createUserOption = (user, id) => {
	if (!user || !id) {
		return;
	}

	let data = JSON.stringify({
		assetType: "User",
		data: [
			{
				Id: id,
				...user,
				ledgerMetadata: {
					owners: [
						{
							orgId: process.env.SPYDRA_MEMBERSHIP_ID,
							user: user.email,
						},
					],
				},
			},
		],
	});

	return {
		method: "post",
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
	const id = Math.floor(Date.now() / 1000);
	let result = await axiosHttpService(createUserOption(user, id));
	if (result.code === 201) {
		return { Id: id, ...result.res };
	}
	return result;
};

const getUserWithEmailOption = (email) => {
	if (!email) {
		return;
	}
	let data = JSON.stringify({
		query: `{
          User(email: "${email}"){
              Id,
              email,
              profile,
              role, 
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

const getUserWithEmail = async (email) => {
	if (!email) {
		return;
	}
	let result = await axiosHttpService(getUserWithEmailOption(email));
	if (result.code === 200) {
		return result.res.data.User;
	}
	return;
};

module.exports = { createNewUser, getUserWithEmail };
