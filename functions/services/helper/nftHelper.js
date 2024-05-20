const { logger } = require("firebase-functions/v1");
const { getGreenData } = require("../greenData");
const { getGreenScore } = require("../greenScore");
const { getTx } = require("../hyperLedgerFunctions/getTx");
const { getMonitoringData } = require("../monitoringData");
const {
	generateHash,
	convertTimestampToDate,
	sortObject,
} = require("./helperFunctions");
const { getInvestmentDetails } = require("./transactionHelper");
const uuid = require("uuid");
const { createNft } = require("../hyperLedgerFunctions/nft");

const createGreenBondNftOptions = async (
	bond,
	repaymentStartTime,
	date,
	hashString,
	monitoringData,
	greenData
) => {
	try {
		logger.info("nftHelper createGreenBondNftOptions execution started");
		const companyDetails = JSON.parse(bond.companyDetails);

		let transactions = await getTx("bondId", bond.Id);
		transactions = transactions.records ? transactions.records : [];
		transactions = transactions.map((tx) => tx.data);

		const trx = await getInvestmentDetails(transactions);

		const nftData = {
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
		logger.log("nftData", nftData);
		logger.info("nftHelper createGreenBondNftOptions execution end");
		return nftData;
	} catch (error) {
		logger.error(error);
	}
};

const createGreenBondNft = async (bond, repaymentStartTime) => {
	try {
		logger.info("nftHelper createGreenBondNft execution started");
		// Get GreenScore
		const scoreResult = await getGreenScore(bond.custodian, bond.loan_name);
		if (scoreResult?.res?.date === undefined) {
			throw new Error("Unable to get GreenScore Data");
		}
		const date = scoreResult.res.date;
		const hashString = generateHash(scoreResult.res);

		// Get GreenMonitoring Data
		const monitoringDataResult = await getMonitoringData(bond.loan_name);

		const monitoringDate = monitoringDataResult.res.date;
		const monitoringHashString = generateHash(monitoringDataResult.res);

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

		let nftData = await createGreenBondNftOptions(
			bond,
			repaymentStartTime,
			date,
			hashString,
			monitoringData,
			greenData
		);

		const nftRes = await createNft(nftData);
		logger.info("nftHelper createGreenBondNft execution end");
		return nftRes;
	} catch (error) {
		logger.error(error);
	}
};

const updateGreenBondNftOptions = (email, nftId, date, hashString) => {
	logger.info("nftHelper updateGreenBondNftOptions execution started");
	const nftData = {
		functionName: "UpdateGreenBondNFTDynamicData",
		identity: email,
		args: [
			nftId,
			"repayments",
			{
				time: date,
				hash: hashString,
			},
		],
	};
	logger.log("nftData", nftData);
	logger.info("nftHelper updateGreenBondNftOptions execution end");
	return nftData;
};

const updateGreenBondNft = async (txData, email, nftId) => {
	try {
		logger.info("nftHelper updateGreenBondNft execution started");
		const date = txData.investedOn;
		//Sorting is needed, because later we will verify the hash
		const sortedTxData = sortObject(txData);
		const hashString = generateHash(sortedTxData);

		const nftData = updateGreenBondNftOptions(
			email,
			nftId,
			date,
			hashString
		);

		// Save repayment tx hash and time in NFT
		const nftRes = await createNft(nftData);
		logger.info("nftHelper updateGreenBondNft execution end");
		return nftRes;
	} catch (error) {
		logger.error(error);
	}
};

const burnGreenBondNft = async (email, nftId) => {
	try {
		logger.info("nftHelper burnGreenBondNft execution started");
		const nftData = {
			functionName: "BurnGreenBondNFT",
			identity: email,
			args: [nftId],
		};
		const nftRes = await createNft(nftData);
		logger.info("nftHelper burnGreenBondNft execution end");
		return nftRes;
	} catch (error) {
		logger.error(error);
	}
};

module.exports = { createGreenBondNft, updateGreenBondNft, burnGreenBondNft };
