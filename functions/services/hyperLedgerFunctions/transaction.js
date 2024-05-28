const { logger } = require("firebase-functions/v1");
const { axiosHttpService } = require("../axioscall");
const uuid = require("uuid");
const {
	repayment,
	distributePay,
	SubscriptionFundsSuccess,
	SubscriptionFundsFailed,
	DisbursementFundsSuccess,
	DisbursementFundsFailed,
	RepaymentFundsSuccess,
	RepaymentFundsFailed,
	PayoutFundsSuccess,
	PayoutFundsFailed,
} = require("../emailHelper");
const {
	getAllUser,
	getUserProfile,
	getEmailAndNameByUserId,
} = require("./userAsset");
const { encryptData, decryptData } = require("../helper/helperFunctions");
const { getTokenized, createTokenized } = require("./tokenizedBond");
const { getGreenBond, createGreenBond } = require("./greenBond");
const {
	getTermLoanAmortisation,
	getBulletLoanAmortisation,
} = require("../amortisation/amortisationSchedule");
const {
	createGreenBondNft,
	burnGreenBondNft,
	updateGreenBondNft,
} = require("../helper/nftHelper");
const { amortisationOptions } = require("../helper/amortisationHelper");
const { getPendingTransactions } = require("../helper/transactionHelper");
const { RequestType } = require("../helper/greenBondHelper");

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
	let action = data.action;
	if (action) {
		delete data.action;
	}
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
		if (transaction.Id) {
			const { email, companyName } = await getEmailAndNameByUserId(
				originalData.subscriberId
					? originalData.subscriberId
					: originalData.issuerId
			);

			let bond = await getGreenBond({
				field: "Id",
				value: originalData.bondId,
			});
			bond = bond.data;
			const custodianCompanyName = await getUserProfile(bond.custodian);
			switch (action) {
				case "InvestConfirm":
					try {
						let totalSubscribed = bond.totalSubscribed
							? bond.totalSubscribed
							: 0;
						const result = await createGreenBond({
							...bond,
							totalSubscribed: (
								+totalSubscribed + +originalData.amount
							).toString(),
							action: "Invest Bond",
						});

						if (result.Id) {
							await SubscriptionFundsSuccess(
								companyName ? companyName : "User",
								RequestType?.[bond.requestType],
								email,
								[bond.custodian],
								admins,
								originalData.bondName,
								originalData.amount
							);
						}
					} catch (error) {
						logger.error(error);
					}
					break;

				case "InvestReject":
					try {
						await SubscriptionFundsFailed(
							companyName ? companyName : "User",
							RequestType?.[bond.requestType],
							email,
							[bond.custodian],
							admins,
							originalData.bondName,
							originalData.amount
						);
					} catch (error) {
						logger.error(error);
					}
					break;

				case "BorrowConfirm":
					try {
						const res = await borrowTransactionConfirm(bond);

						if (res?.Id) {
							await DisbursementFundsSuccess(
								custodianCompanyName
									? custodianCompanyName
									: "User",
								RequestType?.[bond.requestType],
								bond.custodian,
								email,
								admins,
								originalData.bondName,
								originalData.amount
							);
						}
					} catch (error) {
						logger.error(error);
					}
					break;

				case "BorrowReject":
					try {
						await DisbursementFundsFailed(
							custodianCompanyName
								? custodianCompanyName
								: "User",
							RequestType?.[bond.requestType],
							bond.custodian,
							email,
							admins,
							originalData.bondName,
							originalData.amount
						);
					} catch (error) {
						logger.error(error);
					}
					break;

				case "RepayConfirm":
					try {
						const result = await repayTransactionConfirm(
							bond,
							originalData,
							email,
							admins
						);
						if (result.Id) {
							await RepaymentFundsSuccess(
								companyName ? companyName : "User",
								RequestType?.[bond.requestType],
								email,
								bond.custodian,
								admins,
								originalData.bondName,
								originalData.amount
							);
						}
					} catch (error) {
						logger.error(error);
					}
					break;

				case "RepayReject":
					try {
						await RepaymentFundsFailed(
							companyName ? companyName : "User",
							RequestType?.[bond.requestType],
							email,
							bond.custodian,
							admins,
							originalData.bondName,
							originalData.amount
						);
					} catch (error) {
						logger.error(error);
					}
					break;

				case "PayoutConfirm":
					try {
						const result = await payoutTransactionConfirm(
							bond,
							originalData,
							companyName,
							email,
							admins
						);
						if (result.success) {
							await PayoutFundsSuccess(
								custodianCompanyName
									? custodianCompanyName
									: "User",
								RequestType?.[bond.requestType],
								bond.custodian,
								email,
								admins,
								originalData.bondName,
								originalData.amount
							);
						}
					} catch (error) {
						logger.error(error);
					}
					break;

				case "PayoutReject":
					try {
						await PayoutFundsFailed(
							custodianCompanyName
								? custodianCompanyName
								: "User",
							RequestType?.[bond.requestType],
							bond.custodian,
							email,
							admins,
							originalData.bondName,
							originalData.amount
						);
					} catch (error) {
						logger.error(error);
					}
					break;
				default:
					break;
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

const borrowTransactionConfirm = async (bond) => {
	try {
		logger.info(
			"hyperLedger transaction createTx borrowTransactionConfirm execution started"
		);
		let tokenizedBond = {};
		tokenizedBond.bondId = bond.Id;
		tokenizedBond.bondType = bond.loan_type;
		tokenizedBond.bondAmount = +bond.loan_amount;
		tokenizedBond.bondTenureInMonths = bond.loan_tenure;
		tokenizedBond.bondInterest = +bond.loan_interest;
		tokenizedBond.paymentFrequencyInDays = bond.payment_frequency;
		tokenizedBond.repaymentStartTime = Date.now();
		tokenizedBond.repaymentCounter = 1;
		tokenizedBond.custodian = bond.custodian;

		tokenizedBond.totalRepaidAmount = 0;
		tokenizedBond.totalOutstandingPrincipal = +bond.loan_amount;
		tokenizedBond.totalRepayments =
			bond.loan_tenure / bond.payment_frequency;

		const amortisationData = amortisationOptions(
			bond,
			tokenizedBond.repaymentStartTime
		);

		if (bond.loan_type === "1") {
			let res = getTermLoanAmortisation(amortisationData);
			tokenizedBond.emiAmount =
				res.amortisationSchedule[
					tokenizedBond.repaymentCounter - 1
				].totalPayment;
			tokenizedBond.emiAmount = tokenizedBond.emiAmount.toString();
		} else {
			let res = getBulletLoanAmortisation(amortisationData);
			tokenizedBond.emiAmount =
				res.amortisationSchedule[
					tokenizedBond.repaymentCounter - 1
				].totalPayment;
			tokenizedBond.emiAmount = tokenizedBond.emiAmount.toString();
		}

		const nftRes = await createGreenBondNft(
			bond,
			tokenizedBond.repaymentStartTime
		);
		let bondResult;
		if (nftRes.success) {
			const res = await createTokenized({
				...tokenizedBond,
				nftId: nftRes.res.data.substring(1, nftRes.res.data.length - 1),
			});

			if (res.Id) {
				bondResult = await createGreenBond({
					...bond,
					status: 5,
					action: "Tokenize Bond",
				});
			}
		}
		logger.info(
			"hyperLedger transaction createTx borrowTransactionConfirm execution end"
		);
		return bondResult;
	} catch (error) {
		logger.log(error);
	}
};

const repayTransactionConfirm = async (bond, originalData, email, admins) => {
	try {
		logger.info(
			"hyperLedger transaction createTx repayTransactionConfirm execution started"
		);
		let tokenizedBond = await getTokenized("bondId", originalData.bondId);
		tokenizedBond = tokenizedBond.records[0].data;

		// Get custodian email from tokenizedBond
		const custodianEmail = tokenizedBond.custodian;

		// Get nft Id
		const nftId = tokenizedBond.nftId;

		// Save repayment tx hash and time in NFT
		let nftRes = await updateGreenBondNft(
			originalData,
			custodianEmail,
			nftId
		);

		if (nftRes.success) {
			const custodianCompanyName = await getUserProfile(custodianEmail);
			await repayment(
				custodianCompanyName ? custodianCompanyName : "User",
				RequestType?.[bond.requestType],
				custodianEmail,
				email,
				originalData.bondName,
				originalData.amount,
				originalData.transactionDate,
				admins
			);
			let principalPortion,
				principalAmt,
				totalPaidAmt,
				repaymentAmount,
				nextRepaymentAmount;

			const amortisationData = amortisationOptions(
				bond,
				tokenizedBond.repaymentStartTime
			);

			if (bond.loan_type === "1") {
				let res = getTermLoanAmortisation(amortisationData);
				principalPortion =
					res.amortisationSchedule[tokenizedBond.repaymentCounter - 1]
						.principal;
				principalAmt =
					res.amortisationSchedule[tokenizedBond.repaymentCounter - 1]
						.remainingPrincipal;
				repaymentAmount =
					res.amortisationSchedule[tokenizedBond.repaymentCounter - 1]
						.totalPayment;
				nextRepaymentAmount = repaymentAmount;
				totalPaidAmt =
					+tokenizedBond.totalRepaidAmount + +originalData.amount;
			} else {
				let res = getBulletLoanAmortisation(amortisationData);
				principalPortion = 0;
				principalAmt =
					res.amortisationSchedule[tokenizedBond.repaymentCounter - 1]
						.principal;
				repaymentAmount =
					res.amortisationSchedule[tokenizedBond.repaymentCounter - 1]
						.totalPayment;
				nextRepaymentAmount = res.amortisationSchedule[
					tokenizedBond.repaymentCounter
				]?.totalPayment
					? res.amortisationSchedule[tokenizedBond.repaymentCounter]
							.totalPayment
					: "0";
				totalPaidAmt =
					+tokenizedBond.totalRepaidAmount + +originalData.amount;

				// if last repayment, then pay with principal amount
				if (
					tokenizedBond.repaymentCounter ===
					tokenizedBond.totalRepayments
				) {
					principalPortion = principalAmt;
					principalAmt = 0;
				}
			}

			const updatedTokenizedData = {
				...tokenizedBond,
				totalRepaidAmount: totalPaidAmt,
				repaymentCounter: tokenizedBond.repaymentCounter + 1,
				totalOutstandingPrincipal: principalAmt,
				emiAmount: nextRepaymentAmount.toString(),
			};

			const res = await createTokenized(updatedTokenizedData);
			logger.info(
				"hyperLedger transaction createTx repayTransactionConfirm execution end"
			);
			return res;
		}
	} catch (error) {
		logger.error(error);
	}
};

const payoutTransactionConfirm = async (
	bond,
	originalData,
	companyName,
	email,
	admins
) => {
	try {
		logger.info(
			"hyperLedger transaction createTx payoutTransactionConfirm execution started"
		);
		let transactions = await getTx("bondId", bond.Id);
		transactions = transactions.records ? transactions.records : [];
		transactions = transactions.map((tx) => tx.data);

		let pendingPaymentTrx = await getPendingTransactions(transactions);

		for (let i = 0; i < pendingPaymentTrx.length; i++) {
			const pendingPayment = pendingPaymentTrx[i];

			let transaction = {
				...pendingPayment,
				isCouponRateDistributionPending: false,
			};

			const res = await createTx(transaction);

			if (res.Id) {
				await distributePay(
					companyName ? companyName : "User",
					RequestType?.[bond.requestType],
					email,
					bond.custodian,
					originalData.bondName,
					originalData.amount,
					originalData.transactionDate,
					admins
				);

				let tokenizedBond = await getTokenized(
					"bondId",
					originalData.bondId
				);
				tokenizedBond = tokenizedBond.records[0].data;

				const custodianEmail = tokenizedBond.custodian;
				const nftId = tokenizedBond.nftId;

				if (
					tokenizedBond.repaymentCounter >
					tokenizedBond.totalRepayments
				) {
					const result = await createGreenBond({
						...bond,
						status: 6,
						action: "Mature Bond",
					});

					if (result.Id) {
						const nftRes = await burnGreenBondNft(
							custodianEmail,
							nftId
						);
						logger.info(
							"hyperLedger transaction createTx payoutTransactionConfirm execution end"
						);
						return nftRes;
					}
				}
			}
		}
	} catch (error) {
		logger.log(error);
	}
};

module.exports = { createTx, getTx, getAllTx };
