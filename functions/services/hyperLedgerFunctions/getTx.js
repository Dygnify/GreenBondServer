const { logger } = require("firebase-functions/v1");
const { axiosHttpService } = require("../axioscall");

const getTxOption = (field, value) => {
	if (!field || !value) {
		return;
	}
	logger.log(field, value);
	if (field === "Id") {
		return {
			method: "get",
			url: `${process.env.SPYDRA_API_URL}/tokenize/${process.env.SPYDRA_APP_ID}/asset?assetType=Transaction&id=${value}&depth=0`,
			headers: {
				"X-API-KEY": process.env.SPYDRA_API_KEY,
			},
		};
	}
	return {
		method: "get",
		url: `${process.env.SPYDRA_API_URL}/tokenize/${process.env.SPYDRA_APP_ID}/asset/all?assetType=Transaction&pageSize=500&actAs=${field}:${value}`,
		headers: {
			"X-API-KEY": process.env.SPYDRA_API_KEY,
		},
	};
};

const getTx = async (field, value) => {
	logger.info("hyperLedger transaction getTx execution started");
	logger.log(`field: ${field}, value: ${value}`);
	if (!field || !value) {
		return;
	}
	try {
		let result = await axiosHttpService(getTxOption(field, value));
		logger.info("Response from spydra: ", result);
		if (result.code === 200) {
			if (field === "Id") {
				result.res.data = eDCryptTransactionData(result.res.data);
			} else {
				if (result.res.count) {
					result.res.records = result.res.records.map((element) => {
						element.data = eDCryptTransactionData(element.data);
						return element;
					});
				}
			}
			logger.info("hyperLedger transaction getTx execution end");
			return result.res;
		}
		return;
	} catch (error) {
		logger.error(error);
	}
};

const eDCryptTransactionData = (transaction, encrypt = false) => {
	logger.info(
		"hyperLedger transaction eDCryptTransactionData execution started"
	);
	if (!transaction) {
		return;
	}
	try {
		if (transaction.amount) {
			transaction.amount = encrypt
				? encryptData(transaction.amount.toString())
				: +decryptData(transaction.amount);
		}
		if (transaction.benificiaryBankAccNo) {
			transaction.benificiaryBankAccNo = encrypt
				? encryptData(transaction.benificiaryBankAccNo)
				: decryptData(transaction.benificiaryBankAccNo);
		}
		if (transaction.benificiaryName) {
			transaction.benificiaryName = encrypt
				? encryptData(transaction.benificiaryName)
				: decryptData(transaction.benificiaryName);
		}
		if (transaction.utrNo) {
			transaction.utrNo = encrypt
				? encryptData(transaction.utrNo)
				: decryptData(transaction.utrNo);
		}
		if (transaction.interestPortion) {
			transaction.interestPortion = encrypt
				? encryptData(transaction.interestPortion)
				: decryptData(transaction.interestPortion);
		}
		if (transaction.principalPortion) {
			transaction.principalPortion = encrypt
				? encryptData(transaction.principalPortion.toString())
				: +decryptData(transaction.principalPortion);
		}
		if (transaction.repaymentNumber) {
			transaction.repaymentNumber = encrypt
				? encryptData(transaction.repaymentNumber.toString())
				: +decryptData(transaction.repaymentNumber);
		}
		logger.info(
			"hyperLedger transaction eDCryptTransactionData execution end"
		);
		return transaction;
	} catch (error) {
		logger.error(error);
		return;
	}
};

module.exports = { getTx };
