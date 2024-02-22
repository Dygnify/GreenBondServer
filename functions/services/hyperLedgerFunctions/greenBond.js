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
const { convertTimestampToDate } = require("../helper/helperFunctions");

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
	let action = data.action;
	if (action) {
		delete data.action;
	}
	if (!bond.Id) {
		const id = Math.floor(Date.now() / 1000);
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
		if (!bond.Id) {
			await borrowRequestCreation(res.data.email);
		} else {
			switch (action) {
				case "Admin Approved":
					await adminApproval(res.data.email, true);
					break;
				case "Admin Rejected":
					await adminApproval(res.data.email, false);
					break;
				case "Diligence Approved":
					await diligenceApproval(res.data.email, true);
					const result = await getAllUser();
					const subscribers = result.records.filter(
						(user) => user.data.role === 0
					);
					for (let i = 0; i < subscribers.length; i++) {
						let sub = subscribers[i];
						await bondAvailableForSubscription(
							sub.data.email,
							bond.loan_name
						);
					}
					break;
				case "Diligence Rejected":
					await diligenceApproval(res.data.email, false);
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
						let emailsTo = ["custodian@gmail.com"];
						for (let i = 0; i < transactions.length; i++) {
							let tx = transactions[i];
							const res = await getUser(tx.subscriberId);
							emailsTo.push(res.data.email);
						}
						emailsTo = [...new Set(emailsTo)];
						for (let i = 0; i < emailsTo.length; i++) {
							let email = emailsTo[i];
							await fullSubscription(
								email,
								[res.data.email, "admin@gmail.com"],
								bond.loan_name
							);
						}
					}
					break;

				case "Tokenize Bond":
					const subscribersArray = await getSubscribersFromBondId(
						bond.Id
					);
					await tokenizeBond(
						res.data.email,
						[...subscribersArray, "custodian@gmail.com"],
						bond.loan_name
					);
					break;

				case "Mature Bond":
					const subscribersArr = await getSubscribersFromBondId(
						bond.Id
					);
					const todayDate = convertTimestampToDate(Date.now());
					await matureBond(
						res.data.email,
						[
							...subscribersArr,
							"custodian@gmail.com",
							"admin@gmail.com",
						],
						bond.loan_name,
						todayDate
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
			return result.res;
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
			return result.res;
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

module.exports = { createGreenBond, getGreenBond, getAllGreenBonds };
