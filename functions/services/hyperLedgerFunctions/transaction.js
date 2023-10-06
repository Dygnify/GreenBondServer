const { logger } = require("firebase-functions/v1");
const { axiosHttpService } = require("../axioscall");

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
	let data = transaction;
	if (!transaction.Id) {
		const id = Math.floor(Date.now() / 1000);
		data = {
			Id: id.toString(),
			...transaction,
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
		return { Id: data.Id, ...result.res };
	}
	return result;
};

module.exports = { createTx };
