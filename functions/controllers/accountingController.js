const { logger } = require("firebase-functions/v1");
const Loan = require("../models/loan");
const Tranch = require("../models/tranch");
const {
	isDateGreaterThan,
	getDayFromDate,
	addMonthsToDate,
	calculateDateDifferenceInDays,
} = require("../helper/dateFunctions");
const xirr = require("xirr");
const CashFlowParams = require("../models/cashflowParams");

const getLoanEMI = async (req, res) => {
	try {
		// validate the body
		if (!req.body) {
			logger.error("Invalid request data");
			return res.status(400).send("Invalid data");
		}

		logger.info("Loan data received: ", req.body);
		const { error } = Loan.validate(req.body);
		if (error) {
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

		return res.status(200).json(emi);
	} catch (error) {
		logger.error(error);
	}
	return res.status(400).json("Invalid request");
};

const getTermLoanInterestComponentOfEMI = async (req, res) => {
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
		return res.status(200).json(intrest);
	} catch (error) {
		logger.error(error);
	}
	return res.status(400).json("Invalid request");
};

const getNextRepaymentDate = async (req, res) => {
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

		return res.status(200).json(repaymentDate, repaymentDisplayDate);
	} catch (error) {
		logger.error(error);
	}
	return res.status(400).json("Invalid request");
};

const getRepaymentAmount = async (req, res) => {
	try {
		// validate the body
		if (
			!req.body ||
			!req.body.loanStartDate ||
			!req.body.repaymentDueDate ||
			!req.body.delayedInterest ||
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

		return res.status(200).json(finalEmi);
	} catch (error) {
		logger.error(error);
	}
	return res.status(400).json("Invalid request");
};

const getTranchwiseYieldPercentage = async (req, res) => {
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
		return res.status(200).json(tranchwiseYield);
	} catch (error) {
		logger.error(error);
	}
	return res.status(400).json("Invalid request");
};

function generateTermLoanCashflows(
	principal,
	interestRate,
	loanTermInMonths,
	paymentFrequencyInDays,
	disbursementDate,
	investorUpfrontFeePercentage,
	platformFeePercentage,
	juniorTranchFeePercentage,
	JuniorPrincipalFloatInterestPercentage
) {
	try {
		// validate the inputs
		if (
			!principal ||
			principal <= 0 ||
			!interestRate ||
			interestRate <= 0 ||
			interestRate > 100 ||
			!loanTermInMonths ||
			loanTermInMonths <= 0 ||
			!paymentFrequencyInDays ||
			paymentFrequencyInDays <= 0 ||
			investorUpfrontFeePercentage == undefined ||
			investorUpfrontFeePercentage < 0 ||
			getDayFromDate(disbursementDate) > 28 ||
			platformFeePercentage == undefined ||
			platformFeePercentage < 0 ||
			juniorTranchFeePercentage == undefined ||
			juniorTranchFeePercentage < 0 ||
			JuniorPrincipalFloatInterestPercentage == undefined ||
			JuniorPrincipalFloatInterestPercentage < 0
		) {
			return undefined;
		}

		// calculate the emi
		const monthlyInterestRate = interestRate / 100 / 12;
		const emiMonths = Math.abs(
			(loanTermInMonths * 30) / paymentFrequencyInDays
		);
		let monthlyPayment =
			(principal * monthlyInterestRate) /
			(1 - Math.pow(1 + monthlyInterestRate, -emiMonths));

		//calculate the first entry of cashflow
		let remainingPrincipal = principal;
		const amortisationSchedule = [];
		const seniorAmortisationSchedule = [];
		const juniorAmortisationSchedule = [];
		const cashFlow = [];
		const dailyInterestRate = interestRate / 100 / 365;
		const nextRepaymentMonth = paymentFrequencyInDays / 30;
		let nextEmiDate = addMonthsToDate(disbursementDate, nextRepaymentMonth);
		if (!nextEmiDate || dailyInterestRate < 0) {
			return undefined;
		}
		let lastEmiDate = disbursementDate;
		const dDate = new Date(disbursementDate);
		const upfrontInvestorFee =
			(principal * investorUpfrontFeePercentage) / 100;
		cashFlow.push({
			amount: -principal + upfrontInvestorFee,
			when: dDate,
		});

		const juniorInvestorCashFlow = [];
		// junior tranch first entry of cashflow
		let juniorTotalInvestment = 0;
		let juniorUpfrontFees = 0;
		if (juniorTranchFeePercentage && juniorTranchFeePercentage > 0) {
			juniorTotalInvestment =
				(principal * juniorTranchFeePercentage) / 100;
			juniorUpfrontFees =
				(upfrontInvestorFee * juniorTranchFeePercentage) / 100;
			juniorInvestorCashFlow.push({
				amount: -juniorTotalInvestment + juniorUpfrontFees,
				when: dDate,
			});
		}
		const seniorInvestorCashFlow = [];
		// seniortranch first entry of cashflow
		const seniorTotalInvestment = principal - juniorTotalInvestment;
		seniorInvestorCashFlow.push({
			amount:
				-seniorTotalInvestment + upfrontInvestorFee - juniorUpfrontFees,
			when: dDate,
		});

		let juniorAccumulatedPrincipal = 0;
		// amortisation schedule calculation
		for (let month = 1; month <= emiMonths; month++) {
			const noOfDays = calculateDateDifferenceInDays(
				lastEmiDate,
				nextEmiDate
			);
			const interestPayment =
				remainingPrincipal * noOfDays * dailyInterestRate;
			let principalPayment = monthlyPayment - interestPayment;
			remainingPrincipal -= principalPayment;
			if (month === emiMonths) {
				monthlyPayment += remainingPrincipal;
			}
			amortisationSchedule.push({
				month: nextEmiDate,
				days: noOfDays,
				principal: principalPayment,
				interest: interestPayment,
				totalPayment: monthlyPayment,
				remainingPrincipal: remainingPrincipal,
			});
			cashFlow.push({
				amount: monthlyPayment,
				when: nextEmiDate,
			});

			// calculate the platform fee
			const platformFee = (interestPayment * platformFeePercentage) / 100;
			const juniorFees =
				(interestPayment * juniorTranchFeePercentage) / 100;
			// calculate the senior amortisation schedule and cashflow
			const seniorContributionPercentage =
				(100 - juniorTranchFeePercentage) / 100;
			const seniorInterestPortion =
				interestPayment * seniorContributionPercentage -
				platformFee * seniorContributionPercentage -
				juniorFees;
			if (month === emiMonths) {
				principalPayment += remainingPrincipal;
			}
			const seniorPricipalPortion =
				principalPayment * seniorContributionPercentage;
			const seniorPay = seniorInterestPortion + seniorPricipalPortion;
			seniorAmortisationSchedule.push({
				platformFee,
				juniorFees,
				seniorInterestPortion,
				seniorPricipalPortion,
				totalPayment: seniorPay,
			});

			seniorInvestorCashFlow.push({
				amount: seniorPay,
				when: nextEmiDate,
			});

			// calculate the junior amortisation schedule and cashflow
			const juniorInterestPortion =
				(interestPayment * juniorTranchFeePercentage) / 100 -
				(platformFee * juniorTranchFeePercentage) / 100 +
				juniorFees;
			const juniorPricipalPortion =
				(principalPayment * juniorTranchFeePercentage) / 100;
			juniorAccumulatedPrincipal += juniorPricipalPortion;
			const dailyFloatPercentage =
				JuniorPrincipalFloatInterestPercentage / 365 / 100;
			const floatOnPrincipal =
				juniorAccumulatedPrincipal * dailyFloatPercentage * noOfDays;
			const juniorPayout = juniorInterestPortion + floatOnPrincipal;
			const totalJuniorPayout =
				month === emiMonths
					? juniorTotalInvestment + juniorPayout
					: juniorPayout;
			juniorAmortisationSchedule.push({
				juniorInterestPortion,
				juniorPricipalPortion,
				floatOnPrincipal,
				totalJuniorPayout,
			});
			juniorInvestorCashFlow.push({
				amount: totalJuniorPayout,
				when: nextEmiDate,
			});
			// set next dates
			lastEmiDate = nextEmiDate;
			nextEmiDate = addMonthsToDate(disbursementDate, nextRepaymentMonth);
		}

		return {
			amortisationSchedule,
			cashFlow,
			seniorAmortisationSchedule,
			seniorInvestorCashFlow,
			juniorAmortisationSchedule,
			juniorInvestorCashFlow,
		};
	} catch (error) {
		logger.error(error);
	}
	return undefined;
}

const getTermLoanAmortisationSchedule = async (req, res) => {
	try {
		// validate the body
		if (!req.body) {
			logger.error("Invalid request data");
			return res.status(400).send("Invalid data");
		}

		const { error } = CashFlowParams.validate(req.body);
		if (error) {
			return res.status(400).send(error.details);
		}

		const {
			amortisationSchedule,
			cashFlow,
			seniorAmortisationSchedule,
			seniorInvestorCashFlow,
			juniorAmortisationSchedule,
			juniorInvestorCashFlow,
		} = generateTermLoanCashflows(
			req.body.loanAmount,
			req.body.interestRatePercentage,
			req.body.tenureInMonths,
			req.body.paymentFrequencyInDays,
			req.body.disbursmentDate,
			req.body.investorUpfrontFees,
			req.body.platformFeesPercentage,
			req.body.JuniorContributionPercentage,
			req.body.JuniorPrincipalFloatPercentage
		);

		var rate = xirr(cashFlow);
		var seniorXirr;
		var juniorXirr;
		if (req.body.JuniorContributionPercentage != undefined) {
			switch (req.body.JuniorContributionPercentage) {
				case 0:
					seniorXirr = xirr(seniorInvestorCashFlow) * 100;
					juniorXirr = 0;
					break;
				case 100:
					seniorXirr = 0;
					juniorXirr = xirr(juniorInvestorCashFlow) * 100;
					break;
				default:
					seniorXirr = xirr(seniorInvestorCashFlow) * 100;
					juniorXirr = xirr(juniorInvestorCashFlow) * 100;
					break;
			}
		}

		// logs
		console.log("Loan Cashflows:");
		console.table(amortisationSchedule);
		console.table(cashFlow);
		console.log("Borrower XIRR : ", rate * 100);
		console.table(seniorAmortisationSchedule);
		console.table(seniorInvestorCashFlow);
		console.log("Senior XIRR : ", seniorXirr);
		console.table(juniorAmortisationSchedule);
		console.table(juniorInvestorCashFlow);
		console.log("Junior XIRR : ", juniorXirr);

		return res.status(200).json({
			amortisationSchedule,
			cashFlow,
			seniorAmortisationSchedule,
			seniorXirr,
			juniorAmortisationSchedule,
			juniorXirr,
		});
	} catch (error) {
		logger.log(error);
	}
	return res.status(400).send("Invalid request");
};

function generateBulletLoanCashflows(
	principal,
	interestRate,
	loanTermInMonths,
	paymentFrequencyInDays,
	disbursementDate,
	investorUpfrontFeePercentage,
	platformFeePercentage,
	juniorTranchFeePercentage,
	JuniorPrincipalFloatInterestPercentage
) {
	try {
		// validate the inputs
		if (
			!principal ||
			principal <= 0 ||
			!interestRate ||
			interestRate <= 0 ||
			interestRate > 100 ||
			!loanTermInMonths ||
			loanTermInMonths <= 0 ||
			!paymentFrequencyInDays ||
			paymentFrequencyInDays <= 0 ||
			investorUpfrontFeePercentage == undefined ||
			investorUpfrontFeePercentage < 0 ||
			getDayFromDate(disbursementDate) > 30 ||
			platformFeePercentage == undefined ||
			platformFeePercentage < 0 ||
			juniorTranchFeePercentage == undefined ||
			juniorTranchFeePercentage < 0 ||
			JuniorPrincipalFloatInterestPercentage == undefined ||
			JuniorPrincipalFloatInterestPercentage < 0
		) {
			return undefined;
		}

		//calculate the first entry of cashflow
		const amortisationSchedule = [];
		const seniorAmortisationSchedule = [];
		const juniorAmortisationSchedule = [];
		const cashFlow = [];
		const dailyInterestRate = interestRate / 100 / 365;
		const nextRepaymentMonth = paymentFrequencyInDays / 30;
		let nextEmiDate = addMonthsToDate(disbursementDate, nextRepaymentMonth);
		if (!nextEmiDate || dailyInterestRate < 0) {
			return undefined;
		}
		let lastEmiDate = disbursementDate;
		const dDate = new Date(disbursementDate);
		const upfrontInvestorFee =
			(principal * investorUpfrontFeePercentage) / 100;
		cashFlow.push({
			amount: -principal + upfrontInvestorFee,
			when: dDate,
		});

		const juniorInvestorCashFlow = [];
		// junior tranch first entry of cashflow
		let juniorTotalInvestment = 0;
		let juniorUpfrontFees = 0;
		if (juniorTranchFeePercentage && juniorTranchFeePercentage > 0) {
			juniorTotalInvestment =
				(principal * juniorTranchFeePercentage) / 100;
			juniorUpfrontFees =
				(upfrontInvestorFee * juniorTranchFeePercentage) / 100;
			juniorInvestorCashFlow.push({
				amount: -juniorTotalInvestment + juniorUpfrontFees,
				when: dDate,
			});
		}
		const seniorInvestorCashFlow = [];
		// seniortranch first entry of cashflow
		const seniorTotalInvestment = principal - juniorTotalInvestment;
		seniorInvestorCashFlow.push({
			amount:
				-seniorTotalInvestment + upfrontInvestorFee - juniorUpfrontFees,
			when: dDate,
		});

		const seniorContributionPercentage =
			(100 - juniorTranchFeePercentage) / 100;
		const juniorPricipalPortion =
			(principal * juniorTranchFeePercentage) / 100;
		const seniorPricipalPortion = principal * seniorContributionPercentage;
		const emiMonths = Math.abs(
			(loanTermInMonths * 30) / paymentFrequencyInDays
		);
		// amortisation schedule calculation
		for (let month = 1; month <= emiMonths; month++) {
			const noOfDays = calculateDateDifferenceInDays(
				lastEmiDate,
				nextEmiDate
			);
			const interestPayment = principal * noOfDays * dailyInterestRate;
			let emiPayment =
				month === emiMonths
					? interestPayment + principal
					: interestPayment;

			amortisationSchedule.push({
				month: nextEmiDate,
				days: noOfDays,
				principal: month === emiMonths ? principal : 0,
				interest: interestPayment,
				totalPayment: emiPayment,
			});
			cashFlow.push({
				amount: emiPayment,
				when: nextEmiDate,
			});

			// calculate the platform fee
			const platformFee = (interestPayment * platformFeePercentage) / 100;
			const juniorFees =
				(interestPayment * juniorTranchFeePercentage) / 100;
			// calculate the senior amortisation schedule and cashflow
			const seniorInterestPortion =
				interestPayment * seniorContributionPercentage -
				platformFee * seniorContributionPercentage -
				juniorFees;

			const seniorPay =
				month === emiMonths
					? seniorInterestPortion + seniorPricipalPortion
					: seniorInterestPortion;
			seniorAmortisationSchedule.push({
				platformFee,
				juniorFees,
				seniorInterestPortion,
				seniorPricipalPortion:
					month === emiMonths ? seniorPricipalPortion : 0,
				totalPayment: seniorPay,
			});

			seniorInvestorCashFlow.push({
				amount: seniorPay,
				when: nextEmiDate,
			});

			// calculate the junior amortisation schedule and cashflow
			const juniorInterestPortion =
				(interestPayment * juniorTranchFeePercentage) / 100 -
				(platformFee * juniorTranchFeePercentage) / 100 +
				juniorFees;

			const totalJuniorPayout =
				month === emiMonths
					? juniorPricipalPortion + juniorInterestPortion
					: juniorInterestPortion;
			juniorAmortisationSchedule.push({
				juniorInterestPortion,
				juniorPricipalPortion:
					month === emiMonths ? juniorPricipalPortion : 0,
				totalJuniorPayout,
			});
			juniorInvestorCashFlow.push({
				amount: totalJuniorPayout,
				when: nextEmiDate,
			});
			// set next dates
			lastEmiDate = nextEmiDate;
			nextEmiDate = addMonthsToDate(disbursementDate, nextRepaymentMonth);
		}

		return {
			amortisationSchedule,
			cashFlow,
			seniorAmortisationSchedule,
			seniorInvestorCashFlow,
			juniorAmortisationSchedule,
			juniorInvestorCashFlow,
		};
	} catch (error) {
		logger.error(error);
	}
	return undefined;
}

const getBulletLoanAmortisationSchedule = async (req, res) => {
	try {
		// validate the body
		if (!req.body) {
			logger.error("Invalid request data");
			return res.status(400).send("Invalid data");
		}

		const { error } = CashFlowParams.validate(req.body);
		if (error) {
			return res.status(400).send(error.details);
		}

		const {
			amortisationSchedule,
			cashFlow,
			seniorAmortisationSchedule,
			seniorInvestorCashFlow,
			juniorAmortisationSchedule,
			juniorInvestorCashFlow,
		} = generateBulletLoanCashflows(
			req.body.loanAmount,
			req.body.interestRatePercentage,
			req.body.tenureInMonths,
			req.body.paymentFrequencyInDays,
			req.body.disbursmentDate,
			req.body.investorUpfrontFees,
			req.body.platformFeesPercentage,
			req.body.JuniorContributionPercentage,
			req.body.JuniorPrincipalFloatPercentage
		);

		var rate = xirr(cashFlow);
		var seniorXirr;
		var juniorXirr;
		if (req.body.JuniorContributionPercentage != undefined) {
			switch (req.body.JuniorContributionPercentage) {
				case 0:
					seniorXirr = xirr(seniorInvestorCashFlow) * 100;
					juniorXirr = 0;
					break;
				case 100:
					seniorXirr = 0;
					juniorXirr = xirr(juniorInvestorCashFlow) * 100;
					break;
				default:
					seniorXirr = xirr(seniorInvestorCashFlow) * 100;
					juniorXirr = xirr(juniorInvestorCashFlow) * 100;
					break;
			}
		}

		// logs
		console.log("Loan Cashflows:");
		console.table(amortisationSchedule);
		console.table(cashFlow);
		console.log("Borrower XIRR : ", rate * 100);
		console.table(seniorAmortisationSchedule);
		console.table(seniorInvestorCashFlow);
		console.log("Senior XIRR : ", seniorXirr);
		console.table(juniorAmortisationSchedule);
		console.table(juniorInvestorCashFlow);
		console.log("Junior XIRR : ", juniorXirr);

		return res.status(200).json({
			amortisationSchedule,
			cashFlow,
			seniorAmortisationSchedule,
			seniorXirr,
			juniorAmortisationSchedule,
			juniorXirr,
		});
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
