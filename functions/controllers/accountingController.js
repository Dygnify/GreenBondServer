const { logger } = require("firebase-functions/v1");
const Loan = require("../models/loan");
const Tranch = require("../models/tranch");
const {
	isDateGreaterThan,
	calculateDateDifferenceInDays,
} = require("../helper/dateFunctions");
const CashFlowParams = require("../models/cashflowParams");
const {
	getBulletLoanAmortisation,
	getTermLoanAmortisation,
} = require("../services/amortisation/amortisationSchedule");

const getLoanEMI = async (req, res) => {
	logger.info("accountingController getLoanEMI execution start");
	try {
		// validate the body
		if (!req.body) {
			logger.error("Invalid request data");
			return res.status(400).send("Invalid data");
		}

		logger.info("Loan data received: ", req.body);
		const { error } = Loan.validate(req.body);
		if (error) {
			logger.error(error);
			return res.status(400).send(error.details);
		}

		//Calculate the monthly rate
		const repaymentFrequencyInMonths = req.body.repaymentFrequency / 30;
		const totalRepayments =
			req.body.tenureInMonths / repaymentFrequencyInMonths;
		const interestForRepayFreq = 12 / repaymentFrequencyInMonths;

		let emi;
		if (req.body.isTermLoan) {
			const monthlyRate =
				req.body.interestRate / interestForRepayFreq / 100;
			const term = Math.pow(1 + monthlyRate, totalRepayments);
			emi = (monthlyRate * req.body.loanAmount * term) / (term - 1);
		} else {
			const dailyInterest = req.body.interestRate / 100 / 365;
			emi =
				req.body.loanAmount *
				dailyInterest *
				req.body.repaymentFrequency;
		}
		logger.info(`emi: ${emi}`);
		logger.info("accountingController getLoanEMI execution end");
		return res.status(200).json(emi);
	} catch (error) {
		logger.error(error);
	}

	return res.status(400).json("Invalid request");
};

const getTermLoanInterestComponentOfEMI = async (req, res) => {
	logger.info(
		"accountingController getTermLoanInterestComponentOfEMI execution start"
	);
	try {
		// validate the body
		if (
			!req.body ||
			!req.body.outstandingPrincipal ||
			req.body.outstandingPrincipal <= 0 ||
			!req.body.interestRate ||
			req.body.interestRate <= 0 ||
			!req.body.durationInDays ||
			req.body.durationInDays <= 0
		) {
			logger.error("Invalid request data");
			return res.status(400).send("Invalid data");
		}

		//Calculate the daily rate
		const dailyRate = req.body.interestRate / 100 / 365;
		let intrest =
			req.body.outstandingPrincipal * dailyRate * req.body.durationInDays;
		logger.info(`intrest: ${intrest}`);
		logger.info(
			"accountingController getTermLoanInterestComponentOfEMI execution end"
		);
		return res.status(200).json(intrest);
	} catch (error) {
		logger.error(error);
	}
	return res.status(400).json("Invalid request");
};

const getNextRepaymentDate = async (req, res) => {
	logger.info("accountingController getNextRepaymentDate execution start");
	try {
		// validate the body
		if (
			!req.body ||
			!req.body.repaymentStartDate ||
			!req.body.repaymentCounter ||
			!req.body.repaymentFrequency ||
			req.body.repaymentStartDate <= 0 ||
			req.body.repaymentCounter < 0 ||
			req.body.repaymentFrequency <= 0
		) {
			logger.error("Invalid request data");
			return res.status(400).send("Invalid data");
		}

		function pad(s) {
			return s < 10 ? "0" + s : s;
		}

		var repaymentDate = new Date(req.body.repaymentStartDate);
		repaymentDate.setDate(
			repaymentDate.getDate() +
				req.body.repaymentCounter * req.body.repaymentFrequency
		);
		const repaymentDisplayDate = [
			pad(repaymentDate.getDate()),
			pad(repaymentDate.getMonth() + 1),
			repaymentDate.getFullYear(),
		].join("/");
		logger.info(`repaymentDisplayDate: ${repaymentDisplayDate}`);
		logger.info("accountingController getNextRepaymentDate execution end");
		return res.status(200).json(repaymentDate, repaymentDisplayDate);
	} catch (error) {
		logger.error(error);
	}
	return res.status(400).json("Invalid request");
};

const getRepaymentAmount = async (req, res) => {
	logger.info("accountingController getRepaymentAmount execution start");
	try {
		// validate the body
		if (
			!req.body ||
			!req.body.loanStartDate ||
			!req.body.repaymentDueDate ||
			req.body.delayedInterest == undefined ||
			req.body.delayedInterest < 0 ||
			!req.body.outstandingPrincipal ||
			req.body.outstandingPrincipal <= 0 ||
			!req.body.loanInterest ||
			req.body.loanInterest <= 0 ||
			!req.body.emiAmount ||
			req.body.emiAmount <= 0
		) {
			logger.error("Invalid request data");
			return res.status(400).send("Invalid data");
		}

		const currentDate = Date.now();
		var daysFromDueDate = calculateDateDifferenceInDays(
			req.body.repaymentDueDate,
			currentDate
		);
		let finalEmi;
		if (daysFromDueDate == 0) {
			finalEmi = req.body.emiAmount;
		} else if (isDateGreaterThan(currentDate, req.body.repaymentDueDate)) {
			finalEmi =
				req.body.emiAmount +
				(req.body.emiAmount *
					daysFromDueDate *
					req.body.delayedInterest) /
					36500;
		} else {
			// prepayment only considers right now only 1 installment prepayment
			// get the days from last emi payment
			var daysFromLoanStartDate = calculateDateDifferenceInDays(
				req.body.loanStartDate,
				currentDate
			);

			finalEmi =
				req.body.outstandingPrincipal +
				(req.body.outstandingPrincipal *
					daysFromLoanStartDate *
					req.body.loanInterest) /
					36500;
		}
		logger.info("EMI Amount: ", finalEmi);
		logger.info("accountingController getRepaymentAmount execution end");
		return res.status(200).json(finalEmi);
	} catch (error) {
		logger.error(error);
	}
	return res.status(400).json("Invalid request");
};

const getTranchwiseYieldPercentage = async (req, res) => {
	logger.info(
		"accountingController getTranchwiseYieldPercentage execution start"
	);
	try {
		// validate the body
		if (
			!req.body ||
			!req.body.tranches ||
			req.body.tranches.count <= 0 ||
			req.body.isTermLoan === undefined ||
			!req.body.emiAmount ||
			req.body.emiAmount <= 0 ||
			!req.body.totalRepayments ||
			req.body.totalRepayments <= 0 ||
			!req.body.loanAmount ||
			req.body.loanAmount <= 0 ||
			!req.body.interestRate ||
			req.body.interestRate <= 0 ||
			!req.body.loanTenureInDays ||
			req.body.loanTenureInDays <= 0 ||
			!req.body.platformFees
		) {
			logger.error("Invalid request data");
			return res.status(400).send("Invalid data");
		}

		let totalTranchPercentage = 0;
		let tranchFees = 0;
		let commonTranchPercentage = 0;
		const errorMsg = "Invalid tranch data in tranches";
		req.body.tranches.forEach((tranch) => {
			// validate the tranch
			if (!tranch) {
				logger.error(errorMsg);
				return res.status(400).send(errorMsg);
			}
			const { error } = Tranch.validate(tranch);
			if (error) {
				logger.error(error);
				return res.status(400).send(error.details);
			}

			totalTranchPercentage += tranch.percentage;
			if (!tranch.isCommonTranch) {
				tranchFees += tranch.percentage / 100;
			} else {
				commonTranchPercentage = tranch.percentage;
			}
		});

		if (totalTranchPercentage !== 100) {
			const invalidTranchPerErrorMsg =
				"Sum of all tranch percentage must be 100";
			logger.error(invalidTranchPerErrorMsg);
			return res.status(400).send(invalidTranchPerErrorMsg);
		}

		//Loan specific handleing
		let interestRatio;
		if (req.body.isTermLoan) {
			const interestAmount =
				req.body.emiAmount * req.body.totalRepayments -
				req.body.loanAmount;
			interestRatio = interestAmount / req.body.loanAmount;
		} else {
			const interestPerDay = req.body.interestRate / 100 / 365;
			interestRatio = interestPerDay * req.body.loanTenureInDays;
		}

		if (interestRatio < 0) {
			const invalidInterestRatioErrorMsg = "Invalid interest ratio";
			logger.error(invalidInterestRatioErrorMsg);
			return res.status(400).send(invalidInterestRatioErrorMsg);
		}

		//calculate the tranchwise yield
		let tranchwiseYield = [];
		const platformFees = req.body.platformFees / 100;
		req.body.tranches.forEach((tranch) => {
			let yield = 0;
			if (tranch.isCommonTranch) {
				yield = (1 - tranchFees - platformFees) * interestRatio * 100;
			} else {
				yield =
					(1 - platformFees + commonTranchPercentage / 100) *
					interestRatio *
					100;
			}
			tranchwiseYield.push({ ...tranch, yield });
		});
		logger.info("tranchwise yield: ", tranchwiseYield);
		logger.info(
			"accountingController getTranchwiseYieldPercentage execution end"
		);
		return res.status(200).json(tranchwiseYield);
	} catch (error) {
		logger.error(error);
	}
	return res.status(400).json("Invalid request");
};

const getTermLoanAmortisationSchedule = async (req, res) => {
	logger.info(
		"accountingController getTermLoanAmortisationSchedule execution start"
	);
	try {
		// validate the body
		if (!req.body) {
			logger.error("Invalid request data body is null");
			return res.status(400).send("Invalid data");
		}

		const { error } = CashFlowParams.validate(req.body);
		if (error) {
			logger.error(error);
			return res.status(400).send(error.details);
		}

		const termLoanAmortisation = getTermLoanAmortisation(req.body);

		return res.status(200).json(termLoanAmortisation);
	} catch (error) {
		logger.log(error);
	}
	return res.status(400).send("Invalid request");
};

const getBulletLoanAmortisationSchedule = async (req, res) => {
	logger.info(
		"accountingController getBulletLoanAmortisationSchedule execution start"
	);
	try {
		// validate the body
		if (!req.body) {
			logger.error("Invalid request data body is null");
			return res.status(400).send("Invalid data");
		}

		const { error } = CashFlowParams.validate(req.body);
		if (error) {
			logger.error(error);
			return res.status(400).send(error.details);
		}

		const bulletLoanAmortisation = getBulletLoanAmortisation(req.body);

		return res.status(200).json(bulletLoanAmortisation);
	} catch (error) {
		logger.log(error);
	}
	return res.status(400).send("Invalid request");
};

module.exports = {
	getLoanEMI,
	getTermLoanInterestComponentOfEMI,
	getNextRepaymentDate,
	getTranchwiseYieldPercentage,
	getTermLoanAmortisationSchedule,
	getBulletLoanAmortisationSchedule,
	getRepaymentAmount,
};
