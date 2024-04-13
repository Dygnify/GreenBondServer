const { logger } = require("firebase-functions/v1");
const { axiosHttpService } = require("../axioscall");
const uuid = require("uuid");
const { encryptData, decryptData } = require("../helper/helperFunctions");

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
		url: `${process.env.SPYDRA_API_URL}/tokenize/${process.env.SPYDRA_APP_ID}/asset`,
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
	let data = eDCryptTokenizedBondData(tokenizedBond, true);
	if (!tokenizedBond.Id) {
		const id = uuid.v4();
		data = {
			Id: id.toString(),
			...data,
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

const getTokenizedOption = (field, value) => {
	if (!field || !value) {
		return;
	}
	logger.log(field, value);

	if (field === "Id") {
		return {
			method: "get",
			url: `${process.env.SPYDRA_API_URL}/tokenize/${process.env.SPYDRA_APP_ID}/asset?assetType=TokenizedBond&id=${value}&depth=0`,
			headers: {
				"X-API-KEY": process.env.SPYDRA_API_KEY,
			},
		};
	}

	return {
		method: "get",
		url: `${process.env.SPYDRA_API_URL}/tokenize/${process.env.SPYDRA_APP_ID}/asset/all?assetType=TokenizedBond&actAs=${field}:${value}`,
		headers: {
			"X-API-KEY": process.env.SPYDRA_API_KEY,
		},
	};
};

const getTokenized = async (field, value) => {
	logger.log(field, value);
	if (!field || !value) {
		return;
	}
	try {
		let result = await axiosHttpService(getTokenizedOption(field, value));
		if (result.code === 200) {
			if (field === "Id") {
				result.res.data = eDCryptTokenizedBondData(result.res.data);
			} else {
				if (result.res.count) {
					result.res.records = result.res.records.map((element) => {
						element.data = eDCryptTokenizedBondData(element.data);
						return element;
					});
				}
			}

			return result.res;
		}
		return;
	} catch (error) {
		logger.error(error);
	}
};

const eDCryptTokenizedBondData = (tokenizedBond, encrypt = false) => {
	if (!tokenizedBond) {
		return;
	}
	try {
		if (tokenizedBond.bondAmount) {
			tokenizedBond.bondAmount = encrypt
				? encryptData(tokenizedBond.bondAmount.toString())
				: +decryptData(tokenizedBond.bondAmount);
		}
		if (tokenizedBond.bondInterest) {
			tokenizedBond.bondInterest = encrypt
				? encryptData(tokenizedBond.bondInterest.toString())
				: +decryptData(tokenizedBond.bondInterest);
		}
		if (tokenizedBond.emiAmount) {
			tokenizedBond.emiAmount = encrypt
				? encryptData(tokenizedBond.emiAmount)
				: decryptData(tokenizedBond.emiAmount);
		}
		if (tokenizedBond.repaymentCounter) {
			tokenizedBond.repaymentCounter = encrypt
				? encryptData(tokenizedBond.repaymentCounter.toString())
				: +decryptData(tokenizedBond.repaymentCounter);
		}
		if (tokenizedBond.repaymentStartTime) {
			tokenizedBond.repaymentStartTime = encrypt
				? encryptData(tokenizedBond.repaymentStartTime.toString())
				: +decryptData(tokenizedBond.repaymentStartTime);
		}
		if (tokenizedBond.totalOutstandingPrincipal) {
			tokenizedBond.totalOutstandingPrincipal = encrypt
				? encryptData(
						tokenizedBond.totalOutstandingPrincipal.toString()
				  )
				: +decryptData(tokenizedBond.totalOutstandingPrincipal);
		}
		if (tokenizedBond.totalRepaidAmount) {
			tokenizedBond.totalRepaidAmount = encrypt
				? encryptData(tokenizedBond.totalRepaidAmount.toString())
				: +decryptData(tokenizedBond.totalRepaidAmount);
		}
		if (tokenizedBond.totalRepayments) {
			tokenizedBond.totalRepayments = encrypt
				? encryptData(tokenizedBond.totalRepayments.toString())
				: +decryptData(tokenizedBond.totalRepayments);
		}

		return tokenizedBond;
	} catch (error) {
		logger.error(error);
		return;
	}
};

module.exports = { createTokenized, getTokenized };
