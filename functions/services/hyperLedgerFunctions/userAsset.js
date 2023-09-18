const { axiosHttpService } = require("../axioscall");

const createPostOption = (user) => {
	if (!user) {
		return;
	}

	let data = JSON.stringify({
		assetType: "User",
		data: [
			{
				...user,
				ledgerMetadata: {
					owners: [
						{
							orgId: process.env.SPYDRA_MEMBERSHIP_ID,
							user: user.userId,
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

const createPost = async (post) => {
	if (!post) {
		return;
	}
	const id = Math.floor(Date.now() / 1000);
	let result = await axiosHttpService(createPostOption(post, id));
	if (result.code === 201) {
		return { Id: id, ...result.res };
	}
	return result;
};

const getUserProfileOption = (id) => {
	if (!id) {
		return;
	}

	return {
		method: "get",
		maxBodyLength: Infinity,
		url: `https://${process.env.REACT_APP_SPYDRA_MEMBERSHIP_ID}.spydra.app/tokenize/${process.env.REACT_APP_SPYDRA_APP_ID}/asset?assetType=User&id=${id}`,
		headers: {
			"X-API-KEY": process.env.REACT_APP_SPYDRA_API_KEY,
		},
	};
};

const getUserProfile = async (id) => {
	if (!id) {
		return;
	}
	let result = await axiosHttpService(getUserProfileOption(id));
	if (result.code === 200) {
		return result.res;
	}
	return;
};

module.exports = { createPost };
