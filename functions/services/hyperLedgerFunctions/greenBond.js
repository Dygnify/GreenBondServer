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
			Id: id.toString(),
			...bond,
			ledgerMetadata: {
				owners: [
					{
						orgId: process.env.SPYDRA_MEMBERSHIP_ID,
						borrowerId: bond.borrowerId.toString(),
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

const getGreenBondOption = (field, value) => {
	if (!field || !value) {
		return;
	}
	logger.log(field, value);
	if (field === "borrowerId") {
		return {
			method: "get",
			url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/tokenize/${process.env.SPYDRA_APP_ID}/asset/all?assetType=GreenBond&actAs=borrowerId:${value}`,
			headers: {
				"X-API-KEY": process.env.SPYDRA_API_KEY,
			},
		};
	} else if (field === "Id") {
		return {
			method: "get",
			url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/tokenize/${process.env.SPYDRA_APP_ID}/asset?assetType=GreenBond&id=${value}`,
			headers: {
				"X-API-KEY": process.env.SPYDRA_API_KEY,
			},
		};
	}
};

const getGreenBond = async ({ field, value }) => {
	logger.log(field, value);
	if (!field || !value) {
		return;
	}
	try {
		let result = await axiosHttpService(getGreenBondOption(field, value));
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
