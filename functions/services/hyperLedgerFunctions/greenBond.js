const { logger } = require("firebase-functions/v1");
const { axiosHttpService } = require("../axioscall");
const {
	borrowRequestCreation,
	adminApproval,
	diligenceApproval,
	bondAvailableForSubscription,
	fullSubscription,
	tokenizeBond,
	matureBond,
} = require("../emailHelper");
const { getUser, getAllUser, getUserProfile } = require("./userAsset");
const { getTx } = require("./getTx");
const {
	convertTimestampToDate,
	encryptData,
	decryptData,
} = require("../helper/helperFunctions");
const uuid = require("uuid");
const { RequestType } = require("../helper/greenBondHelper");

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
		url: `${process.env.SPYDRA_API_URL}/tokenize/${process.env.SPYDRA_APP_ID}/asset`,
		headers: {
			"Content-Type": "application/json",
			"X-API-KEY": process.env.SPYDRA_API_KEY,
		},
		data: data,
	};
};

const eDCryptBondData = (bond, encrypt = false) => {
	if (!bond) {
		return;
	}
	try {
		if (bond.collateral_document_description) {
			bond.collateral_document_description = encrypt
				? encryptData(bond.collateral_document_description)
				: decryptData(bond.collateral_document_description);
		}
		if (bond.companyDetails) {
			bond.companyDetails = encrypt
				? encryptData(bond.companyDetails)
				: decryptData(bond.companyDetails);
		}
		if (bond.loan_amount) {
			bond.loan_amount = encrypt
				? encryptData(bond.loan_amount)
				: decryptData(bond.loan_amount);
		}
		if (bond.loan_interest) {
			bond.loan_interest = encrypt
				? encryptData(bond.loan_interest)
				: decryptData(bond.loan_interest);
		}
		if (bond.loan_purpose) {
			bond.loan_purpose = encrypt
				? encryptData(bond.loan_purpose)
				: decryptData(bond.loan_purpose);
		}
		return bond;
	} catch (error) {
		logger.error(error);
		return;
	}
};

const createGreenBond = async (bond) => {
	logger.info("hyperLedger greenBond createGreenBond execution started");
	if (!bond) {
		return;
	}
	let data = eDCryptBondData(bond, true);
	let action = data.action;
	if (action) {
		delete data.action;
	}
	if (!bond.Id) {
		const id = uuid.v4();
		data = {
			Id: id.toString(),
			...data,
			ledgerMetadata: {
				owners: [
					{
						orgId: process.env.SPYDRA_MEMBERSHIP_ID,
						borrowerId: bond.borrowerId.toString(),
						loan_name: bond.loan_name,
					},
				],
			},
		};
	}
	let result = await axiosHttpService(createGreenBondOption(data));
	logger.info("Response from Spydra: ", result);
	if (result.code === 201) {
		const res = await getUser(bond.borrowerId.toString());
		const profile = JSON.parse(res.data.profile);
		const companyName = profile.companyName;

		// Get admins
		let admins = [];
		const adminResult = await getAllUser();

		adminResult.records.forEach((user) => {
			if (user.data.role === 4) {
				admins.push(user.data.email);
			}
		});

		if (!bond.Id) {
			await borrowRequestCreation(
				companyName ? companyName : "User",
				RequestType?.[bond.requestType],
				res.data.email,
				admins
			);
		} else {
			switch (action) {
				case "Admin Approved":
					var diligenceCompanyName = await getUserProfile(
						bond.diligence
					);
					await adminApproval(
						diligenceCompanyName ? diligenceCompanyName : "User",
						RequestType?.[bond.requestType],
						bond.diligence,
						true,
						admins
					);
					break;
				case "Admin Rejected":
					var diligenceCompanyName = await getUserProfile(
						bond.diligence
					);
					await adminApproval(
						diligenceCompanyName ? diligenceCompanyName : "User",
						RequestType?.[bond.requestType],
						bond.diligence,
						false,
						admins
					);
					break;
				case "Diligence Approved":
					await diligenceApproval(
						companyName ? companyName : "User",
						RequestType?.[bond.requestType],
						res.data.email,
						true,
						admins
					);
					const result = await getAllUser();
					const subscribers = result.records.filter(
						(user) => user.data.role === 0
					);
					for (let i = 0; i < subscribers.length; i++) {
						let sub = subscribers[i];
						const profile = JSON.parse(sub.data.profile);
						const companyName = profile.companyName;
						await bondAvailableForSubscription(
							companyName ? companyName : "User",
							RequestType?.[bond.requestType],
							sub.data.email,
							bond.loan_name,
							admins
						);
					}
					break;
				case "Diligence Rejected":
					await diligenceApproval(
						companyName ? companyName : "User",
						RequestType?.[bond.requestType],
						res.data.email,
						false,
						admins
					);
					break;

				case "Invest Bond":
					if (bond.loan_amount === bond.totalSubscribed) {
						let transactions = await getTx("bondId", bond.Id);
						transactions = transactions.records
							? transactions.records
							: [];
						transactions = transactions.map((tx) => tx.data);
						transactions = transactions.filter(
							(tx) =>
								tx.investorTransactionType === 0 &&
								tx.bondId === bond.Id
						);
						let emailsTo = [
							{ companyName: companyName, email: res.data.email },
						];
						const result = await getAllUser();

						result.records.forEach((user) => {
							if (user.data.role === 2) {
								const profile = JSON.parse(user.data.profile);
								const companyName = profile.companyName;
								emailsTo.push({
									companyName: companyName,
									email: user.data.email,
								});
							}
						});

						for (let i = 0; i < transactions.length; i++) {
							let tx = transactions[i];
							const res = await getUser(tx.subscriberId);
							const profile = JSON.parse(res.data.profile);
							const companyName = profile.companyName;
							emailsTo.push({
								companyName: companyName,
								email: res.data.email,
							});
						}

						// Filter unique emails
						emailsTo = emailsTo.filter((value, index, array) => {
							return (
								array.findIndex(
									(obj) =>
										obj.companyName === value.companyName &&
										obj.email === value.email
								) === index
							);
						});

						for (let i = 0; i < emailsTo.length; i++) {
							await fullSubscription(
								emailsTo[i].companyName
									? emailsTo[i].companyName
									: "User",
								RequestType?.[bond.requestType],
								emailsTo[i].email,
								admins,
								bond.loan_name
							);
						}
					}
					break;

				case "Tokenize Bond":
					const subscribersArray = await getSubscribersFromBondId(
						bond.Id
					);
					let custodians = [];
					const results = await getAllUser();

					results.records.forEach((user) => {
						if (user.data.role === 2) {
							custodians.push(user.data.email);
						}
					});
					await tokenizeBond(
						companyName ? companyName : "User",
						RequestType?.[bond.requestType],
						res.data.email,
						[...subscribersArray, ...custodians],
						bond.loan_name,
						admins
					);
					break;

				case "Mature Bond":
					const subscribersArr = await getSubscribersFromBondId(
						bond.Id
					);
					const todayDate = convertTimestampToDate(Date.now());
					let custodianUsers = [];
					const custodianResult = await getAllUser();

					custodianResult.records.forEach((user) => {
						if (user.data.role === 2) {
							custodianUsers.push(user.data.email);
						}
					});

					await matureBond(
						companyName ? companyName : "User",
						RequestType?.[bond.requestType],
						res.data.email,
						[...subscribersArr, ...custodianUsers],
						bond.loan_name,
						todayDate,
						admins
					);
					break;
				default:
					break;
			}
		}
		logger.info("hyperLedger greenBond createGreenBond execution end");
		return { Id: data.Id, ...result.res };
	}
	return result;
};

const getGreenBondOption = (field, value) => {
	if (!field || value === undefined) {
		return;
	}
	logger.log(field, value);
	if (field === "Id") {
		return {
			method: "get",
			url: `${process.env.SPYDRA_API_URL}/tokenize/${process.env.SPYDRA_APP_ID}/asset?assetType=GreenBond&id=${value}&depth=0`,
			headers: {
				"X-API-KEY": process.env.SPYDRA_API_KEY,
			},
		};
	} else if (field === "loan_name") {
		return {
			method: "get",
			url: `${process.env.SPYDRA_API_URL}/tokenize/${process.env.SPYDRA_APP_ID}/asset/all?assetType=GreenBond&actAs=loan_name:${value}`,
			headers: {
				"X-API-KEY": process.env.SPYDRA_API_KEY,
			},
		};
	} else if (field === "borrowerId") {
		return {
			method: "get",
			url: `${process.env.SPYDRA_API_URL}/tokenize/${process.env.SPYDRA_APP_ID}/asset/all?assetType=GreenBond&actAs=borrowerId:${value}`,
			headers: {
				"X-API-KEY": process.env.SPYDRA_API_KEY,
			},
		};
	} else {
		let queryFields;
		if (typeof field === "string") {
			let fieldValue = typeof value === "string" ? `"${value}"` : value;
			queryFields = `${field}: ${fieldValue}`;
		} else {
			queryFields = field
				.map((fieldElement, index) => {
					let valueElement =
						typeof value[index] === "string"
							? `"${value[index]}"`
							: value[index];
					return `${fieldElement}: ${valueElement}`;
				})
				.join(", ");
		}
		let data = JSON.stringify({
			query: `{
			  GreenBond(${queryFields}){
				  Id,
				  borrowerId,
				  capital_loss,
				  collateralHash,
				  collateral_document_description, 
				  collateral_document_name,
				  collateral_filename,
				  companyDetails,
				  loan_amount,
				  loan_interest,
				  loan_name,
				  loan_purpose,
				  loan_tenure,
				  loan_type,
				  payment_frequency,
				  status,
				  createdOn,
				  isRecurring,
				  isPercentageOfCoupon,
				  percentageOfCoupon,
				  fixedAmount,
				  investorUpfrontFeesPercentage,
				  juniorTranchPercentage,
				  juniorTranchFloatInterestPercentage,
				  ghgEmissionReduction,
				  sopDocHash,
				  issueNoteDoc,
				  delayChargeRatePercentage,
				  totalSubscribed,
				  requestType,
				  custodian,
				  diligence
		  }}`,
		});
		return {
			method: "post",
			maxBodyLength: Infinity,
			url: `${process.env.SPYDRA_API_URL}/tokenize/${process.env.SPYDRA_APP_ID}/graphql`,
			headers: {
				"X-API-KEY": process.env.SPYDRA_API_KEY,
				"Content-Type": "application/json",
			},
			data: data,
		};
	}
};

const getGreenBond = async ({ field, value }) => {
	logger.info("hyperLedger greenBond getGreenBond execution started");
	logger.log(field, value);
	if (!field || value === undefined) {
		return;
	}
	try {
		let result = await axiosHttpService(getGreenBondOption(field, value));
		logger.info("Response from spydra: ", result);
		if (result.code === 200) {
			let res = result.res;
			if (field === "Id") {
				res.data = eDCryptBondData(res.data);
			} else if (field === "loan_name" || field === "borrowerId") {
				if (res.count) {
					res.records = res.records.map((element) => {
						element.data = eDCryptBondData(element.data);
						return element;
					});
				}
			} else {
				if (result.code === 200) {
					res.data.GreenBond = res.data.GreenBond.map((element) => {
						element = eDCryptBondData(element);
						return element;
					});
				}
			}
			logger.info("hyperLedger greenBond getGreenBond execution end");
			return res;
		}
		return;
	} catch (error) {
		logger.error(error);
	}
};

const getAllGreenBondsOption = (pageSize, bookmark) => {
	return {
		method: "get",
		url: `${process.env.SPYDRA_API_URL}/tokenize/${
			process.env.SPYDRA_APP_ID
		}/asset/all?assetType=GreenBond&pageSize=${pageSize}${
			bookmark ? `&bookmark=${bookmark}` : ""
		}`,
		headers: {
			"X-API-KEY": process.env.SPYDRA_API_KEY,
		},
	};
};

const getAllGreenBonds = async (pageSize = 500, bookmark) => {
	logger.info("hyperLedger greenBond getAllGreenBonds execution started");
	try {
		let result = await axiosHttpService(
			getAllGreenBondsOption(pageSize, bookmark)
		);
		logger.info("Response from spydra: ", result);
		if (result.code === 200) {
			let res = result.res;
			if (res.count) {
				res.records = res.records.map((element) => {
					element.data = eDCryptBondData(element.data);
					return element;
				});
			}
			logger.info("hyperLedger greenBond getAllGreenBonds execution end");
			return res;
		}
		return;
	} catch (error) {
		logger.error(error);
	}
};

const getSubscribersFromBondId = async (bondId) => {
	logger.info(
		"hyperLedger greenBond getSubscribersFromBondId execution started"
	);
	let transactions = await getTx("bondId", bondId);
	transactions = transactions.records ? transactions.records : [];
	transactions = transactions.map((tx) => tx.data);
	transactions = transactions.filter(
		(tx) => tx.investorTransactionType === 0 && tx.bondId === bondId
	);
	let subscribersArray = [];
	for (let i = 0; i < transactions.length; i++) {
		let tx = transactions[i];
		const res = await getUser(tx.subscriberId);
		subscribersArray.push(res.data.email);
	}
	subscribersArray = [...new Set(subscribersArray)];
	logger.info("Subscriber array: ", subscribersArray);
	logger.info("hyperLedger greenBond getSubscribersFromBondId execution end");
	return subscribersArray;
};

const getBondWithStatusOption = (status) => {
	if (!status) {
		return;
	}

	let data = JSON.stringify({
		query: `{
			GreenBond(status: ${status}){
              Id,
			  borrowerId,
			  companyDetails,
			  loan_name,
			  loan_amount
      }}`,
	});

	return {
		method: "post",
		maxBodyLength: Infinity,
		url: `${process.env.SPYDRA_API_URL}/tokenize/${process.env.SPYDRA_APP_ID}/graphql`,
		headers: {
			"X-API-KEY": process.env.SPYDRA_API_KEY,
			"Content-Type": "application/json",
		},
		data: data,
	};
};

const getAllBondsWithStatus = async (status) => {
	logger.info(
		"hyperLedger greenBond getAllBondsWithStatus execution started"
	);
	logger.info("Input status: ", status);
	if (!status) {
		return;
	}
	try {
		let result = await axiosHttpService(getBondWithStatusOption(status));
		logger.info("Response from spydra: ", result);
		if (result.code === 200) {
			let res = result.res;
			if (res.data.GreenBond_count) {
				res.data.GreenBond = res.data.GreenBond.map((element) => {
					element = eDCryptBondData(element);
					return element;
				});
			}
			logger.info(
				"hyperLedger greenBond getAllBondsWithStatus execution end"
			);
			return res;
		}
		return;
	} catch (error) {
		logger.error(error);
	}
};

module.exports = {
	createGreenBond,
	getGreenBond,
	getAllGreenBonds,
	getAllBondsWithStatus,
};
