const { logger } = require("firebase-functions/v1");
const {
	createNft: createNftFunction,
	getNft: getNftFunction,
	burnNft: burnNftFunction,
} = require("../services/hyperLedgerFunctions/nft");
const Nft = require("../models/nft");
const { axiosHttpService } = require("../services/axioscall");
const { getGreenBond } = require("../services/hyperLedgerFunctions/greenBond");
const {
	getTokenized,
} = require("../services/hyperLedgerFunctions/tokenizedBond");
const CryptoJS = require("crypto-js");

// Create bond
const createNft = async (req, res) => {
	try {
		// validate the body
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}

		const { error } = Nft.validate(req.body);
		if (error) {
			return res.status(400).send(error.details);
		}

		// store in hyperledger
		var result = await createNftFunction(req.body);
		if (result.success) {
			return res
				.status(200)
				.json({ success: result.success, ...result.res });
		} else {
			return res
				.status(result.code)
				.json({ success: result.success, ...result.res });
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).send("Invalid request");
};

// Get list of bonds for an user
const getNft = async (req, res) => {
	try {
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}

		var result = await getNftFunction(req.body);
		if (result.success) {
			return res
				.status(200)
				.json({ success: result.success, ...result.res });
		} else {
			return res
				.status(result.code)
				.json({ success: result.success, ...result.res });
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).json("Invalid request");
};

const burnNft = async (req, res) => {
	try {
		// validate the body
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}

		const { error } = Nft.validate(req.body);
		if (error) {
			return res.status(400).send(error.details);
		}

		// store in hyperledger
		var result = await burnNftFunction(req.body);
		if (result.success) {
			return res
				.status(200)
				.json({ success: result.success, ...result.res });
		} else {
			return res
				.status(result.code)
				.json({ success: result.success, ...result.res });
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).send("Invalid request");
};

// Webhook Request
const webhook = async (req, res) => {
	try {
		if (req.body.event === "GreenDataUpdated") {
			const projectId = req.body.projectId;
			const bond = await getGreenBond({
				field: "loan_name",
				value: projectId,
			});
			if (bond.count) {
				const bondId = bond.records[0].id;
				if (bond.records[0].data.status === 5) {
					const tokenizedBond = await getTokenized("bondId", bondId);
					if (tokenizedBond.count) {
						const nftId = tokenizedBond.records[0].data.nftId;
						let nft = await getNftFunction({
							functionName: "QueryGreenBondNFT",
							args: [nftId],
						});
						if (nft.success) {
							nft = nft.res;
							const monitoringOptions = {
								url: `${process.env.REACT_APP_GREENDATA_API_URI}/getGreenMonitoringData`,
								method: "POST",
								maxBodyLength: Infinity,
								headers: {
									"Content-Type": "application/json",
									"X-API-KEY": process.env.GREENDATA_API_KEY,
								},
								data: {
									projectId: projectId,
								},
							};
							const monitoringResult = await axiosHttpService(
								monitoringOptions
							);
							if (monitoringResult.code !== 200) {
								throw new Error(
									`Unable to get MonitoringData for projectId: ${projectId}`
								);
							}
							const date = monitoringResult.res.date;
							let dateExistsInNft = false;
							nft.greenDataMonitoringHashList.forEach(
								(element) => {
									if (element.time === date) {
										dateExistsInNft = true;
										return;
									}
								}
							);
							if (!dateExistsInNft) {
								let stringObj = JSON.stringify(
									monitoringResult.res
								);
								let hash = CryptoJS.SHA256(stringObj);
								let hashString = hash.toString(
									CryptoJS.enc.Hex
								);
								let nftData = {
									functionName:
										"UpdateGreenBondNFTDynamicData",
									identity: "custodian@gmail.com",
									args: [
										nftId,
										"greenDataMonitoringHashList",
										{
											time: date,
											hash: hashString,
										},
									],
								};
								await createNftFunction(nftData);
								const greenDataOptions = {
									url: `${process.env.REACT_APP_GREENDATA_API_URI}/getGreenData`,
									method: "POST",
									maxBodyLength: Infinity,
									headers: {
										"Content-Type": "application/json",
										"X-API-KEY":
											process.env.GREENDATA_API_KEY,
									},
									data: {
										projectId: projectId,
									},
								};
								const greenDataResult = await axiosHttpService(
									greenDataOptions
								);
								if (greenDataResult.code !== 200) {
									throw new Error(
										`Unable to get GreenData for projectId: ${projectId}`
									);
								}
								stringObj = JSON.stringify(greenDataResult.res);
								hash = CryptoJS.SHA256(stringObj);
								hashString = hash.toString(CryptoJS.enc.Hex);
								nftData = {
									functionName:
										"UpdateGreenBondNFTDynamicData",
									identity: "custodian@gmail.com",
									args: [
										nftId,
										"greenDataHashList",
										{
											time: date,
											hash: hashString,
										},
									],
								};
								await createNftFunction(nftData);
							}
						}
					}
				}
			}
		}
		return res.send("Received!");
	} catch (error) {
		logger.error(error);
		res.status(400).send("Invalid request");
	}
};
module.exports = { createNft, getNft, burnNft, webhook };
