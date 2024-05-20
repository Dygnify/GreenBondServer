const { logger } = require("firebase-functions/v1");
const { convertTimestampToDateDashed } = require("./helperFunctions");

const amortisationOptions = (bond, repaymentStartTime) => {
	try {
		logger.info("amortisationHelper amortisationOptions execution started");
		const amortisationData = {
			loanAmount: +bond.loan_amount,
			interestRatePercentage: +bond.loan_interest,
			tenureInMonths: +bond.loan_tenure / 30,
			paymentFrequencyInDays: +bond.payment_frequency,
			disbursmentDate: convertTimestampToDateDashed(repaymentStartTime),
			investorUpfrontFees: +bond.investorUpfrontFeesPercentage,
			platformFeesPercentage:
				bond.percentageOfCoupon !== undefined
					? +bond.percentageOfCoupon
					: 0,
			JuniorContributionPercentage: +bond.juniorTranchPercentage,
			JuniorPrincipalFloatPercentage:
				+bond.juniorTranchFloatInterestPercentage,
		};
		logger.log("amortisationData", amortisationData);
		logger.info("amortisationHelper amortisationOptions execution end");
		return amortisationData;
	} catch (error) {
		logger.error(error);
	}
};

module.exports = { amortisationOptions };
