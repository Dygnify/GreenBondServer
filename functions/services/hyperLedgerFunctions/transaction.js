const { logger } = require("firebase-functions/v1");
const { axiosHttpService } = require("../axioscall");
const uuid = require("uuid");
const { repayment } = require("../emailHelper");
const { getUser } = require("./userAsset");

const createTxOption = (transaction) => {
	if (!transaction) {
		return;
	}

	let data = JSON.stringify({
		assetType: "Transaction",
		data: [transaction],
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

const createTx = async (transaction) => {
	if (!transaction) {
		return;
	}
	console.log(transaction);
	let data = transaction;
	if (!transaction.Id) {
		const id = uuid.v4();
		data = {
			Id: id.toString(),
			...data,
			ledgerMetadata: {
				owners: [
					{
						orgId: process.env.SPYDRA_MEMBERSHIP_ID,
						bondId: transaction.bondId,
						issuerId: transaction.issuerId,
						subscriberId: transaction.subscriberId,
					},
				],
			},
		};
	}
	let result = await axiosHttpService(createTxOption(data));
	if (result.code === 201) {
		if (!transaction.Id && transaction?.borrowerTransactionType === 1) {
			const res = await getUser(transaction.issuerId);
			await repayment(
				"custodian@gmail.com",
				[res.data.email, "admin@gmail.com"],
				transaction.bondName,
				transaction.amount,
				transaction.transactionDate
			);
		}
		return { Id: data.Id, ...result.res };
	}
	return result;
};

const getTxOption = (field, value) => {
	if (!field || !value) {
		return;
	}
	logger.log(field, value);
	if (field === "Id") {
		return {
			method: "get",
			url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/tokenize/${process.env.SPYDRA_APP_ID}/asset?assetType=Transaction&id=${value}&depth=0`,
			headers: {
				"X-API-KEY": process.env.SPYDRA_API_KEY,
			},
		};
	}
	return {
		method: "get",
		url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/tokenize/${process.env.SPYDRA_APP_ID}/asset/all?assetType=Transaction&pageSize=500&actAs=${field}:${value}`,
		headers: {
			"X-API-KEY": process.env.SPYDRA_API_KEY,
		},
	};
};

const getTx = async (field, value) => {
	logger.log(field, value);
	if (!field || !value) {
		return;
	}
	try {
		let result = await axiosHttpService(getTxOption(field, value));
		if (result.code === 200) {
			return result.res;
		}
		return;
	} catch (error) {
		logger.error(error);
	}
};

const getAllTxOption = (pageSize, bookmark) => {
	return {
		method: "get",
		url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/tokenize/${
			process.env.SPYDRA_APP_ID
		}/asset/all?assetType=Transaction&pageSize=${pageSize}${
			bookmark ? `&bookmark=${bookmark}` : ""
		}`,
		headers: {
			"X-API-KEY": process.env.SPYDRA_API_KEY,
		},
	};
};

const getAllTx = async (pageSize = 500, bookmark) => {
	try {
		let result = await axiosHttpService(getAllTxOption(pageSize, bookmark));
		if (result.code === 200) {
			return result.res;
		}
		return;
	} catch (error) {
		logger.error(error);
	}
};

module.exports = { createTx, getTx, getAllTx };
