const { logger } = require("firebase-functions/v1");
const { axiosHttpService } = require("../axioscall");

const createGreenBondOption = (bond) => {
	if (!bond) {
		return;
	}

	let data = JSON.stringify({
		assetType: "GreenBond",
		data: [bond],
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

const createGreenBond = async (bond) => {
	if (!bond) {
		return;
	}
	let data = bond;
	if (!bond.Id) {
		const id = Math.floor(Date.now() / 1000);
		data = {
			Id: id,
			...bond,
			ledgerMetadata: {
				owners: [
					{
						orgId: process.env.SPYDRA_MEMBERSHIP_ID,
						UserId: bond.borrowerId.toString(),
					},
				],
			},
		};
	}
	let result = await axiosHttpService(createGreenBondOption(data));
	if (result.code === 201) {
		return { Id: data.Id, ...result.res };
	}
	return result;
};

const getGreenBondOption = (Id) => {
	if (!Id) {
		return;
	}
	logger.log(Id);

	return {
		method: "get",
		url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/tokenize/${process.env.SPYDRA_APP_ID}/asset/all?assetType=GreenBond&actAs=UserId:${Id}`,
		headers: {
			"X-API-KEY": process.env.SPYDRA_API_KEY,
		},
	};
};

const getGreenBond = async (Id) => {
	logger.log(Id);
	if (!Id) {
		return;
	}
	try {
		let result = await axiosHttpService(getGreenBondOption(Id));
		if (result.code === 200) {
			return result.res;
		}
		return;
	} catch (error) {
		logger.error(error);
	}
};

const getAllGreenBondsOption = () => {
	return {
		method: "get",
		url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/tokenize/${process.env.SPYDRA_APP_ID}/asset/all?assetType=GreenBond`,
		headers: {
			"X-API-KEY": process.env.SPYDRA_API_KEY,
		},
	};
};

const getAllGreenBonds = async () => {
	try {
		let result = await axiosHttpService(getAllGreenBondsOption());
		if (result.code === 200) {
			return result.res;
		}
		return;
	} catch (error) {
		logger.error(error);
	}
};

module.exports = { createGreenBond, getGreenBond, getAllGreenBonds };
