const { logger } = require("firebase-functions/v1");
const { axiosHttpService } = require("../axioscall");

const createNftOption = (data) => {
	if (!data) {
		return;
	}

	return {
		method: "post",
		maxBodyLength: Infinity,
		url: `${process.env.SPYDRA_API_URL}/fabric/${process.env.SPYDRA_NFT_APP_ID}/ledger/transact`,
		headers: {
			"Content-Type": "application/json",
			"X-API-KEY": process.env.SPYDRA_API_KEY,
		},
		data: JSON.stringify(data),
	};
};

const createNft = async (data) => {
	logger.info("hyperLedger nft createNft execution started");
	if (!data) {
		return;
	}
	try {
		let result = await axiosHttpService(createNftOption(data));
		logger.info("Response from spydra: ", result);
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
		url: `${process.env.SPYDRA_API_URL}/fabric/${process.env.SPYDRA_NFT_APP_ID}/ledger/query`,
		headers: {
			"Content-Type": "application/json",
			"X-API-KEY": process.env.SPYDRA_API_KEY,
		},
		data: JSON.stringify(data),
	};
};

const getNft = async (data) => {
	logger.info("hyperLedger nft getNft execution started");
	if (!data) {
		return;
	}
	try {
		let result = await axiosHttpService(getNftOption(data));
		logger.info("Response from spydra: ", result);
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
		url: `${process.env.SPYDRA_API_URL}/fabric/${process.env.SPYDRA_NFT_APP_ID}/ledger/transact`,
		headers: {
			"Content-Type": "application/json",
			"X-API-KEY": process.env.SPYDRA_API_KEY,
		},
		data: JSON.stringify(data),
	};
};

const burnNft = async (data) => {
	logger.info("hyperLedger nft burnNft execution started");
	if (!data) {
		return;
	}
	try {
		let result = await axiosHttpService(burnNftOption(data));
		logger.info("Response from spydra: ", result);
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
