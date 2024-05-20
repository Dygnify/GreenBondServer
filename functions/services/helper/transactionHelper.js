const { logger } = require("firebase-functions/v1");
const { getUser } = require("../hyperLedgerFunctions/userAsset");

const TransactionStatus = {
	InVerification: 0,
	Completed: 1,
	Failed: 2,
};

const InvestorTransactionType = {
	Invest: 0,
	Payout: 1,
};

const getInvestmentDetails = async (transactions) => {
	try {
		logger.info("transactionHelper getInvestmentDetails execution started");
		let trx = [];
		for (let index = 0; index < transactions.length; index++) {
			const element = transactions[index];
			if (
				element.subscriberId &&
				element.status === TransactionStatus.Completed &&
				element.investorTransactionType ===
					InvestorTransactionType.Invest
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
		logger.info("transactionHelper getInvestmentDetails execution end");
		return trx;
	} catch (error) {
		logger.error(error);
	}
};

const getPendingTransactions = async (transactions) => {
	try {
		logger.info(
			"transactionHelper getPendingTransactions execution started"
		);
		let paymentPendingTrx = [];
		for (let index = 0; index < transactions.length; index++) {
			const element = transactions[index];
			if (
				element.issuerId &&
				element.status === TransactionStatus.Completed &&
				element.isCouponRateDistributionPending
			) {
				paymentPendingTrx.push(element);
			}
		}
		logger.info("transactionHelper getPendingTransactions execution end");
		return paymentPendingTrx;
	} catch (error) {
		logger.error(error);
	}
};

module.exports = {
	getInvestmentDetails,
	getPendingTransactions,
	TransactionStatus,
	InvestorTransactionType,
};
