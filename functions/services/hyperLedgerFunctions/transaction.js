const { logger } = require("firebase-functions/v1");
const { axiosHttpService } = require("../axioscall");
const uuid = require("uuid");
const { repayment, distributePay } = require("../emailHelper");
const { getUser, getAllUser } = require("./userAsset");
const {
	encryptData,
	decryptData,
	sortObject,
} = require("../helper/helperFunctions");
const { createNft } = require("./nft");
const { getTokenized } = require("./tokenizedBond");
const CryptoJS = require("crypto-js");

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
		url: `${process.env.SPYDRA_API_URL}/tokenize/${process.env.SPYDRA_APP_ID}/asset`,
		headers: {
			"Content-Type": "application/json",
			"X-API-KEY": process.env.SPYDRA_API_KEY,
		},
		data: data,
	};
};

const createTx = async (transaction) => {
	logger.info("hyperLedger transaction createTx execution started");
	if (!transaction) {
		return;
	}
	let originalData = { ...transaction };
	let data = eDCryptTransactionData(transaction, true);
	if (!transaction.Id) {
		const id = uuid.v4();
		originalData.Id = id.toString();
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
	logger.info("Response from spydra: ", result);
	if (result.code === 201) {
		let admins = [];
		const adminResult = await getAllUser();

		adminResult.records.forEach((user) => {
			if (user.data.role === 4) {
				admins.push(user.data.email);
			}
		});
		if (!transaction.Id) {
			if (transaction?.borrowerTransactionType === 1) {
				const date = originalData.investedOn;

				//Sorting is needed, because later we will verify the hash
				const sortedTxData = sortObject(originalData);

				let stringObj = JSON.stringify(sortedTxData);
				let hash = CryptoJS.SHA256(stringObj);
				let hashString = hash.toString(CryptoJS.enc.Hex);

				// Get tokenizedBond
				const tokenizedBond = await getTokenized(
					"bondId",
					originalData.bondId
				);

				// Get custodian email from tokenizedBond
				const custodianEmail = tokenizedBond.records[0].data?.custodian;

				// Get nft Id
				const nftId = tokenizedBond.records[0].data.nftId;

				let nftData = {
					functionName: "UpdateGreenBondNFTDynamicData",
					identity: custodianEmail,
					args: [
						nftId,
						"repayments",
						{
							time: date,
							hash: hashString,
						},
					],
				};

				// Save repayment tx hash and time in NFT
				await createNft(nftData);

				const res = await getUser(transaction.issuerId);
				let custodians = [];
				const result = await getAllUser();

				result.records.forEach((user) => {
					if (user.data.role === 2) {
						const profile = JSON.parse(user.data.profile);
						const companyName = profile.companyName;
						custodians.push({
							companyName: companyName,
							email: user.data.email,
						});
					}
				});

				for (let i = 0; i < custodians.length; i++) {
					await repayment(
						custodians[i].companyName
							? custodians[i].companyName
							: "User",
						custodians[i].email,
						res.data.email,
						originalData.bondName,
						originalData.amount,
						originalData.transactionDate,
						admins
					);
				}
			} else if (transaction?.investorTransactionType === 1) {
				const res = await getUser(transaction.subscriberId);
				const profile = JSON.parse(res.data.profile);
				const companyName = profile.companyName;
				let custodians = [];
				const results = await getAllUser();

				results.records.forEach((user) => {
					if (user.data.role === 2) {
						custodians.push(user.data.email);
					}
				});
				await distributePay(
					companyName ? companyName : "User",
					res.data.email,
					custodians,
					originalData.bondName,
					originalData.amount,
					originalData.transactionDate,
					admins
				);
			}
		}
		logger.info("hyperLedger transaction createTx execution end");
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

const getAllTxOption = (pageSize, bookmark) => {
	return {
		method: "get",
		url: `${process.env.SPYDRA_API_URL}/tokenize/${
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
	logger.info("hyperLedger transaction getAllTx execution started");
	try {
		let result = await axiosHttpService(getAllTxOption(pageSize, bookmark));
		logger.info("Response from spydra: ", result);
		if (result.code === 200) {
			if (result.res.count) {
				result.res.records = result.res.records.map((element) => {
					element.data = eDCryptTransactionData(element.data);
					return element;
				});
			}
			logger.info("hyperLedger transaction getAllTx execution end");
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

module.exports = { createTx, getTx, getAllTx };
