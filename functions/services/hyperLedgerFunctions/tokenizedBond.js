const { logger } = require("firebase-functions/v1");
const { axiosHttpService } = require("../axioscall");

const createTokenizedOption = (tokenizedBond) => {
	if (!tokenizedBond) {
		return;
	}

	let data = JSON.stringify({
		assetType: "TokenizedBond",
		data: [tokenizedBond],
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

const createTokenized = async (tokenizedBond) => {
	if (!tokenizedBond) {
		return;
	}
	let data = tokenizedBond;
	if (!tokenizedBond.Id) {
		const id = Math.floor(Date.now() / 1000);
		data = {
			Id: id.toString(),
			...tokenizedBond,
			ledgerMetadata: {
				owners: [
					{
						orgId: process.env.SPYDRA_MEMBERSHIP_ID,
						bondId: tokenizedBond.bondId,
					},
				],
			},
		};
	}
	let result = await axiosHttpService(createTokenizedOption(data));
	if (result.code === 201) {
		return { Id: data.Id, ...result.res };
	}
	return result;
};

module.exports = { createTokenized };
