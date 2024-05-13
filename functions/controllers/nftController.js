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
	logger.info("nftController createNft execution started");
	try {
		// validate the body
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}

		const { error } = Nft.validate(req.body);
		if (error) {
			logger.error("NFT validation error: ", error);
			return res.status(400).send(error.details);
		}

		// store in hyperledger
		var result = await createNftFunction(req.body);
		logger.info("Create NFT result: ", result);
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
	logger.info("nftController getNft execution started");
	try {
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}

		var result = await getNftFunction(req.body);
		logger.info("get NFT result: ", result);
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
	logger.info("nftController burnNft execution started");
	try {
		// validate the body
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}

		const { error } = Nft.validate(req.body);
		if (error) {
			logger.error("Validation error: ", error);
			return res.status(400).send(error.details);
		}

		// store in hyperledger
		var result = await burnNftFunction(req.body);
		logger.info("Burn Nft result: ", result);
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
async function getProjectNFT(projectName) {
	logger.info("nftController getProjectNft execution started");
	try {
		if (!projectName) {
			return;
		}
		const bond = await getGreenBond({
			field: "loan_name",
			value: projectName,
		});
		logger.info("Bond received: ", bond);
		if (bond.count <= 0 || bond.records[0].data?.status !== 5) {
			logger.info("return from function");
			return;
		}
		const bondId = bond.records[0].id;

		const tokenizedBond = await getTokenized("bondId", bondId);
		logger.info("Tokenized bond received: ", tokenizedBond);
		if (tokenizedBond.count <= 0) {
			logger.info("return from function");
			return;
		}

		const nftId = tokenizedBond.records[0].data?.nftId;
		let nftRes = await getNftFunction({
			functionName: "QueryGreenBondNFT",
			args: [nftId],
		});
		logger.info("Nft response: ", nftRes);
		if (!nftRes.success) {
			logger.info("return from function");
			return;
		}

		return {
			nft: nftRes.res,
			custodian: tokenizedBond.records[0].data?.custodian,
		};
	} catch (error) {
		logger.error(error);
	}
}

const webhook = async (req, res) => {
	logger.info("nftController webhook execution started");
	try {
		if (req.body.event === "GreenDataUpdated") {
			const projectId = req.body.projectId;
			const bond = await getGreenBond({
				field: "loan_name",
				value: projectId,
			});
			logger.info("Bond received: ", bond);
			if (bond.count) {
				const bondId = bond.records[0].id;
				if (bond.records[0].data.status === 5) {
					const tokenizedBond = await getTokenized("bondId", bondId);
					logger.info("tokenized bond received: ", tokenizedBond);
					if (tokenizedBond.count) {
						const nftId = tokenizedBond.records[0].data.nftId;
						let nft = await getNftFunction({
							functionName: "QueryGreenBondNFT",
							args: [nftId],
						});
						logger.info("nft response: ", nft);
						if (nft.success) {
							nft = nft.res;
							const monitoringOptions = {
								url: `${process.env.GREENDATA_API_URI}/getGreenMonitoringData`,
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
										logger.info(
											"date already exist in nft, returning"
										);
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
									identity:
										tokenizedBond.records[0].data
											?.custodian,
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
									url: `${process.env.GREENDATA_API_URI}/getGreenData`,
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
									identity:
										tokenizedBond.records[0].data
											?.custodian,
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
		} else if (req.body?.event === "GreenScoreUpdated") {
			//get project NFT
			let { nft, custodian } = await getProjectNFT(req.body?.projectId);
			if (!nft || !custodian) {
				logger.info("nft not found or custodian is not valid");
				return;
			}
			var date = req.body?.hashWithTime?.time;
			// check for duplicacy
			let dateExistsInNft = false;
			nft.greenScoreHashList.forEach((element) => {
				if (element.time === date) {
					dateExistsInNft = true;
					logger.info(
						"score data for the date already exists, returning"
					);
					return;
				}
			});
			if (dateExistsInNft) {
				return;
			}

			nftData = {
				functionName: "UpdateGreenBondNFTDynamicData",
				identity: custodian,
				args: [
					nft.tokenId,
					"greenScoreHashList",
					req.body?.hashWithTime,
				],
			};
			await createNftFunction(nftData);
		}
		return res.send("Received!");
	} catch (error) {
		logger.error(error);
		res.status(400).send("Invalid request");
	}
};
module.exports = { createNft, getNft, burnNft, webhook };
