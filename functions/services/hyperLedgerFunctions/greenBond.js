const { logger } = require("firebase-functions/v1");
const { axiosHttpService } = require("../axioscall");
const {
	borrowRequestCreation,
	adminApproval,
	diligenceApproval,
	bondAvailableForSubscription,
} = require("../emailHelper");
const { getUser, getAllUser } = require("./userAsset");

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
		} else if (action === "Admin Approved" || action === "Admin Rejected") {
			await adminApproval(
				res.data.email,
				action === "Admin Approved" ? true : false
			);
		} else if (
			action === "Diligence Approved" ||
			action === "Diligence Rejected"
		) {
			await diligenceApproval(
				res.data.email,
				action === "Diligence Approved" ? true : false
			);
			// Send Bond is available for subscription
			if (action === "Diligence Approved") {
				const res = await getAllUser();
				const subscribers = res.records.filter(
					(user) => user.data.role === 0
				);
				subscribers.forEach(async (sub) => {
					await bondAvailableForSubscription(
						sub.data.email,
						bond.loan_name
					);
				});
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

module.exports = { createGreenBond, getGreenBond, getAllGreenBonds };
