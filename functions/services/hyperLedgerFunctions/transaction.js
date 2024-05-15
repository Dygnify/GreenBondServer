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
} = require("../emailHelper");
const {
	getUser,
	getAllUser,
	getUserProfile,
	getEmailAndNameByUserId,
} = require("./userAsset");
const {
	encryptData,
	decryptData,
	sortObject,
	convertTimestampToDate,
	generateHash,
	convertTimestampToDateDashed,
} = require("../helper/helperFunctions");
const { createNft } = require("./nft");
const { getTokenized, createTokenized } = require("./tokenizedBond");
const { getGreenBond, createGreenBond } = require("./greenBond");
const {
	getTermLoanAmortisation,
	getBulletLoanAmortisation,
} = require("../amortisation/amortisationSchedule");
const { getGreenScore } = require("../greenScore");
const { getGreenData } = require("../greenData");
const { getMonitoringData } = require("../monitoringData");

const InvestorTransactionType = {
	Invest: 0,
	Payout: 1,
};

const BorrowerTransactionType = {
	Borrowed: 0,
	Repaid: 1,
};

const TransactionStatus = {
	InVerification: 0,
	Completed: 1,
	Failed: 2,
};

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
		if (!transaction.Id) {
			if (transaction?.investorTransactionType === 1) {
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
		} else {
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
							const custodianCompanyName = await getUserProfile(
								bond.custodian
							);

							await DisbursementFundsSuccess(
								custodianCompanyName
									? custodianCompanyName
									: "User",
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
						var custodianCompanyName = await getUserProfile(
							bond.custodian
						);
						await DisbursementFundsFailed(
							custodianCompanyName
								? custodianCompanyName
								: "User",
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
						let tokenizedBond = await getTokenized(
							"bondId",
							originalData.bondId
						);
						tokenizedBond = tokenizedBond.records[0].data;

						const date = originalData.investedOn;

						//Sorting is needed, because later we will verify the hash
						const sortedTxData = sortObject(originalData);
						let hashString = generateHash(sortedTxData);

						// Get custodian email from tokenizedBond
						const custodianEmail = tokenizedBond.custodian;

						// Get nft Id
						const nftId = tokenizedBond.nftId;

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
						let nftRes = await createNft(nftData);
						if (nftRes.success) {
							const custodianCompanyName = await getUserProfile(
								custodianEmail
							);
							await repayment(
								custodianCompanyName
									? custodianCompanyName
									: "User",
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

							const amortisationData = {
								loanAmount: +bond.loan_amount,
								interestRatePercentage: +bond.loan_interest,
								tenureInMonths: +bond.loan_tenure / 30,
								paymentFrequencyInDays: +bond.payment_frequency,
								disbursmentDate: convertTimestampToDateDashed(
									tokenizedBond.repaymentStartTime
								),
								investorUpfrontFees:
									+bond.investorUpfrontFeesPercentage,
								platformFeesPercentage:
									bond.percentageOfCoupon !== undefined
										? +bond.percentageOfCoupon
										: 0,
								JuniorContributionPercentage:
									+bond.juniorTranchPercentage,
								JuniorPrincipalFloatPercentage:
									+bond.juniorTranchFloatInterestPercentage,
							};

							if (bond.loan_type === "1") {
								let res =
									getTermLoanAmortisation(amortisationData);
								principalPortion =
									res.amortisationSchedule[
										tokenizedBond.repaymentCounter - 1
									].principal;
								principalAmt =
									res.amortisationSchedule[
										tokenizedBond.repaymentCounter - 1
									].remainingPrincipal;
								repaymentAmount =
									res.amortisationSchedule[
										tokenizedBond.repaymentCounter - 1
									].totalPayment;
								nextRepaymentAmount = repaymentAmount;
								totalPaidAmt =
									+tokenizedBond.totalRepaidAmount +
									+originalData.amount;
							} else {
								let res =
									getBulletLoanAmortisation(amortisationData);
								principalPortion = 0;
								principalAmt =
									res.amortisationSchedule[
										tokenizedBond.repaymentCounter - 1
									].principal;
								repaymentAmount =
									res.amortisationSchedule[
										tokenizedBond.repaymentCounter - 1
									].totalPayment;
								nextRepaymentAmount = res.amortisationSchedule[
									tokenizedBond.repaymentCounter
								]?.totalPayment
									? res.amortisationSchedule[
											tokenizedBond.repaymentCounter
									  ].totalPayment
									: "0";
								totalPaidAmt =
									+tokenizedBond.totalRepaidAmount +
									+originalData.amount;

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
								repaymentCounter:
									tokenizedBond.repaymentCounter + 1,
								totalOutstandingPrincipal: principalAmt,
								emiAmount: nextRepaymentAmount.toString(),
							};

							const res = await createTokenized(
								updatedTokenizedData
							);

							if (res.Id) {
								await RepaymentFundsSuccess(
									companyName ? companyName : "User",
									email,
									bond.custodian,
									admins,
									originalData.bondName,
									originalData.amount
								);
							}
						}
					} catch (error) {
						logger.error(error);
					}
					break;

				case "RepayReject":
					try {
						await RepaymentFundsFailed(
							companyName ? companyName : "User",
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

const getInvestmentDetails = async (transactions) => {
	let trx = [];
	for (let index = 0; index < transactions.length; index++) {
		const element = transactions[index];
		if (
			element.subscriberId &&
			element.status === TransactionStatus.Completed &&
			element.investorTransactionType === InvestorTransactionType.Invest
		) {
			// get the subscriber
			const result = await getUser(element.subscriberId);
			const subData = result.data;
			trx.push({
				email: subData?.email,
				amount: element.amount,
			});
		}
	}
	return trx;
};

const borrowTransactionConfirm = async (bond) => {
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
	tokenizedBond.totalRepayments = bond.loan_tenure / bond.payment_frequency;

	// Get GreenScore
	const scoreResult = await getGreenScore(bond.custodian, bond.loan_name);
	if (scoreResult?.res?.date === undefined) {
		throw new Error("Unable to get GreenScore Data");
	}
	let date = scoreResult.res.date;
	let hashString = generateHash(scoreResult.res);

	// Get GreenMonitoring Data
	const monitoringDataResult = await getMonitoringData(bond.loan_name);

	let monitoringDate = monitoringDataResult.res.date;
	let monitoringHashString = generateHash(monitoringDataResult.res);

	let monitoringData = [];
	if (monitoringDataResult?.res?.date !== undefined) {
		monitoringData.push({
			time: monitoringDate,
			hash: monitoringHashString,
		});
	}

	// Get Green Data
	const greenDataResult = await getGreenData(bond.loan_name);

	let greenDataDate = monitoringDate;
	let greenDataHashString = generateHash(greenDataResult.res);

	let greenData = [];
	if (greenDataResult?.res?.greenSiteData !== undefined) {
		greenData.push({
			time: greenDataDate,
			hash: greenDataHashString,
		});
	}

	let transactions = await getTx("bondId", bond.Id);
	transactions = transactions.records ? transactions.records : [];
	transactions = transactions.map((tx) => tx.data);

	let nftData = await nftOptions(
		bond,
		tokenizedBond.repaymentStartTime,
		date,
		hashString,
		monitoringData,
		greenData
	);

	const amortisationData = {
		loanAmount: +bond.loan_amount,
		interestRatePercentage: +bond.loan_interest,
		tenureInMonths: +bond.loan_tenure / 30,
		paymentFrequencyInDays: +bond.payment_frequency,
		disbursmentDate: convertTimestampToDateDashed(
			tokenizedBond.repaymentStartTime
		),
		investorUpfrontFees: +bond.investorUpfrontFeesPercentage,
		platformFeesPercentage:
			bond.percentageOfCoupon !== undefined
				? +bond.percentageOfCoupon
				: 0,
		JuniorContributionPercentage: +bond.juniorTranchPercentage,
		JuniorPrincipalFloatPercentage:
			+bond.juniorTranchFloatInterestPercentage,
	};

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

	const nftRes = await createNft(nftData);
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
	return bondResult;
};

const nftOptions = async (
	bond,
	repaymentStartTime,
	date,
	hashString,
	monitoringData,
	greenData
) => {
	const companyDetails = JSON.parse(bond.companyDetails);

	let transactions = await getTx("bondId", bond.Id);
	transactions = transactions.records ? transactions.records : [];
	transactions = transactions.map((tx) => tx.data);

	let trx = await getInvestmentDetails(transactions);

	let nftData = {
		functionName: "CreateGreenBondNFT",
		identity: bond.custodian,
		args: [
			uuid.v4(),
			{
				name: bond.loan_name,
				amount: bond.loan_amount,
				couponRate: bond.loan_interest,
				issueDate: convertTimestampToDate(repaymentStartTime),
				tenure: bond.loan_tenure,
				bondType: bond.loan_type,
				paymentFrequency: bond.payment_frequency,
				collateralDocHash: bond.collateralHash,
				capitalLossPercentage: bond.capital_loss,
			},
			companyDetails?.companyName,
			bond.custodian,
			trx.map((element) => {
				return {
					subscriber: element.email,
					amount: element.amount,
				};
			}),
			[
				{
					time: date,
					hash: hashString,
				},
			],
			[...monitoringData],
			[...greenData],
		],
	};
	return nftData;
};

module.exports = { createTx, getTx, getAllTx };
