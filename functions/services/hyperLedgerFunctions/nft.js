const { logger } = require("firebase-functions/v1");
const { axiosHttpService } = require("../axioscall");

const createNftOption = (data) => {
	if (!data) {
		return;
	}

	return {
		method: "post",
		maxBodyLength: Infinity,
		url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/fabric/${process.env.SPYDRA_NFT_APP_ID}/ledger/transact`,
		headers: {
			"Content-Type": "application/json",
			"X-API-KEY": process.env.SPYDRA_API_KEY,
		},
		data: JSON.stringify(data),
	};
};

const createNft = async (data) => {
	if (!data) {
		return;
	}
	try {
		let result = await axiosHttpService(createNftOption(data));
		if (result.code === 200) {
			return { success: true, ...result };
		} else {
			return { success: false, ...result };
		}
	} catch (error) {
		logger.error(error);
		return { success: false, ...result, error: error };
	}
};

const getNftOption = (data) => {
	if (!data) {
		return;
	}
	return {
		method: "post",
		maxBodyLength: Infinity,
		url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/fabric/${process.env.SPYDRA_NFT_APP_ID}/ledger/query`,
		headers: {
			"Content-Type": "application/json",
			"X-API-KEY": process.env.SPYDRA_API_KEY,
		},
		data: JSON.stringify(data),
	};
};

const getNft = async (data) => {
	if (!data) {
		return;
	}
	try {
		let result = await axiosHttpService(getNftOption(data));
		if (result.code === 200) {
			return { success: true, ...result };
		} else {
			return { success: false, ...result };
		}
	} catch (error) {
		logger.error(error);
		return { success: false, ...result, error: error };
	}
};

const burnNftOption = (data) => {
	if (!data) {
		return;
	}

	return {
		method: "post",
		maxBodyLength: Infinity,
		url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/fabric/${process.env.SPYDRA_NFT_APP_ID}/ledger/transact`,
		headers: {
			"Content-Type": "application/json",
			"X-API-KEY": process.env.SPYDRA_API_KEY,
		},
		data: JSON.stringify(data),
	};
};

const burnNft = async (data) => {
	if (!data) {
		return;
	}
	try {
		let result = await axiosHttpService(burnNftOption(data));
		if (result.code === 200) {
			return { success: true, ...result };
		} else {
			return { success: false, ...result };
		}
	} catch (error) {
		logger.error(error);
		return { success: false, ...result, error: error };
	}
};

module.exports = { createNft, getNft, burnNft };
