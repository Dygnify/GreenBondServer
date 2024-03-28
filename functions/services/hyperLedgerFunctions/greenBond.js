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
const { getUser, getAllUser } = require("./userAsset");
const { getTx } = require("./transaction");
const {
	convertTimestampToDate,
	encryptData,
	decryptData,
} = require("../helper/helperFunctions");
const uuid = require("uuid");

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
	} catch (error) {
		logger.error(error);
	}
};

const createGreenBond = async (bond) => {
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
				res.data.email,
				admins
			);
		} else {
			switch (action) {
				case "Admin Approved":
					await adminApproval(
						companyName ? companyName : "User",
						res.data.email,
						true,
						admins
					);
					break;
				case "Admin Rejected":
					await adminApproval(
						companyName ? companyName : "User",
						res.data.email,
						false,
						admins
					);
					break;
				case "Diligence Approved":
					await diligenceApproval(
						companyName ? companyName : "User",
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
							sub.data.email,
							bond.loan_name,
							admins
						);
					}
					break;
				case "Diligence Rejected":
					await diligenceApproval(
						companyName ? companyName : "User",
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
						console.log(transactions);
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
		return { Id: data.Id, ...result.res };
	}
	return result;
};

const getGreenBondOption = (field, value) => {
	if (!field || !value) {
		return;
	}
	logger.log(field, value);
	if (field === "Id") {
		return {
			method: "get",
			url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/tokenize/${process.env.SPYDRA_APP_ID}/asset?assetType=GreenBond&id=${value}&depth=0`,
			headers: {
				"X-API-KEY": process.env.SPYDRA_API_KEY,
			},
		};
	} else if (field === "loan_name") {
		return {
			method: "get",
			url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/tokenize/${process.env.SPYDRA_APP_ID}/asset/all?assetType=GreenBond&actAs=loan_name:${value}`,
			headers: {
				"X-API-KEY": process.env.SPYDRA_API_KEY,
			},
		};
	}
	return {
		method: "get",
		url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/tokenize/${process.env.SPYDRA_APP_ID}/asset/all?assetType=GreenBond&actAs=borrowerId:${value}`,
		headers: {
			"X-API-KEY": process.env.SPYDRA_API_KEY,
		},
	};
};

const getGreenBond = async ({ field, value }) => {
	logger.log(field, value);
	if (!field || !value) {
		return;
	}
	try {
		let result = await axiosHttpService(getGreenBondOption(field, value));
		if (result.code === 200) {
			return eDCryptBondData(result.res);
		}
		return;
	} catch (error) {
		logger.error(error);
	}
};

const getAllGreenBondsOption = (pageSize, bookmark) => {
	return {
		method: "get",
		url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/tokenize/${
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
	try {
		let result = await axiosHttpService(
			getAllGreenBondsOption(pageSize, bookmark)
		);
		if (result.code === 200) {
			return eDCryptBondData(result.res);
		}
		return;
	} catch (error) {
		logger.error(error);
	}
};

const getSubscribersFromBondId = async (bondId) => {
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
		url: `https://${process.env.SPYDRA_MEMBERSHIP_ID}.spydra.app/tokenize/${process.env.SPYDRA_APP_ID}/graphql`,
		headers: {
			"X-API-KEY": process.env.SPYDRA_API_KEY,
			"Content-Type": "application/json",
		},
		data: data,
	};
};

const getAllBondsWithStatus = async (status) => {
	logger.info("getAllBondsWithStatus start with input status: ", status);
	if (!status) {
		return;
	}
	try {
		let result = await axiosHttpService(getBondWithStatusOption(status));
		if (result.code === 200) {
			return eDCryptBondData(result.res);
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
