const { logger } = require("firebase-functions/v1");
const xirr = require("xirr");
const {
	addMonthsToDate,
	calculateDateDifferenceInDays,
	getDayFromDate,
} = require("../../helper/dateFunctions");

const getTermLoanAmortisation = (details) => {
	const {
		amortisationSchedule,
		cashFlow,
		seniorAmortisationSchedule,
		seniorInvestorCashFlow,
		juniorAmortisationSchedule,
		juniorInvestorCashFlow,
	} = generateTermLoanCashflows(
		details.loanAmount,
		details.interestRatePercentage,
		details.tenureInMonths,
		details.paymentFrequencyInDays,
		details.disbursmentDate,
		details.investorUpfrontFees,
		details.platformFeesPercentage,
		details.JuniorContributionPercentage,
		details.JuniorPrincipalFloatPercentage
	);

	var rate = xirr(cashFlow);
	var seniorXirr;
	var juniorXirr;
	if (details.JuniorContributionPercentage != undefined) {
		switch (details.JuniorContributionPercentage) {
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
	logger.info("Loan Cashflows:");
	console.table(amortisationSchedule);
	console.table(cashFlow);
	logger.info("Borrower XIRR : ", rate * 100);
	console.table(seniorAmortisationSchedule);
	console.table(seniorInvestorCashFlow);
	logger.info("Senior XIRR : ", seniorXirr);
	console.table(juniorAmortisationSchedule);
	console.table(juniorInvestorCashFlow);
	logger.info("Junior XIRR : ", juniorXirr);
	logger.info(
		"accountingController getTermLoanAmortisationSchedule execution end"
	);
	return {
		amortisationSchedule,
		cashFlow,
		seniorAmortisationSchedule,
		seniorXirr,
		juniorAmortisationSchedule,
		juniorXirr,
	};
};

const generateTermLoanCashflows = (
	principal,
	interestRate,
	loanTermInMonths,
	paymentFrequencyInDays,
	disbursementDate,
	investorUpfrontFeePercentage,
	platformFeePercentage,
	juniorTranchFeePercentage,
	JuniorPrincipalFloatInterestPercentage
) => {
	logger.info(
		"accountingController generateTermLoanCashflows execution start"
	);
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
			logger.error("Invalid parameters");
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
			logger.error(
				`Invalid next EMI date ${nextEmiDate} or daily interest rate ${dailyInterestRate}`
			);
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

		logger.info(
			"accountingController generateTermLoanCashflows execution end"
		);
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
};

const getBulletLoanAmortisation = (details) => {
	const {
		amortisationSchedule,
		cashFlow,
		seniorAmortisationSchedule,
		seniorInvestorCashFlow,
		juniorAmortisationSchedule,
		juniorInvestorCashFlow,
	} = generateBulletLoanCashflows(
		details.loanAmount,
		details.interestRatePercentage,
		details.tenureInMonths,
		details.paymentFrequencyInDays,
		details.disbursmentDate,
		details.investorUpfrontFees,
		details.platformFeesPercentage,
		details.JuniorContributionPercentage,
		details.JuniorPrincipalFloatPercentage
	);

	var rate = xirr(cashFlow);
	var seniorXirr;
	var juniorXirr;
	if (details.JuniorContributionPercentage != undefined) {
		switch (details.JuniorContributionPercentage) {
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
	logger.info("Loan Cashflows:");
	console.table(amortisationSchedule);
	console.table(cashFlow);
	logger.info("Borrower XIRR : ", rate * 100);
	console.table(seniorAmortisationSchedule);
	console.table(seniorInvestorCashFlow);
	logger.info("Senior XIRR : ", seniorXirr);
	console.table(juniorAmortisationSchedule);
	console.table(juniorInvestorCashFlow);
	logger.info("Junior XIRR : ", juniorXirr);
	logger.info(
		"accountingController getBulletLoanAmortisationSchedule execution end"
	);
	return {
		amortisationSchedule,
		cashFlow,
		seniorAmortisationSchedule,
		seniorXirr,
		juniorAmortisationSchedule,
		juniorXirr,
	};
};

const generateBulletLoanCashflows = (
	principal,
	interestRate,
	loanTermInMonths,
	paymentFrequencyInDays,
	disbursementDate,
	investorUpfrontFeePercentage,
	platformFeePercentage,
	juniorTranchFeePercentage,
	JuniorPrincipalFloatInterestPercentage
) => {
	logger.info(
		"accountingController generateBulletLoanCashflows execution start"
	);
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
			logger.error("Invalid parameters");
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
			logger.error(
				`Invalid next EMI date ${nextEmiDate} or daily interest rate ${dailyInterestRate}`
			);
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
		logger.info(
			"accountingController generateBulletLoanCashflows execution end"
		);
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
};

module.exports = {
	getBulletLoanAmortisation,
	getTermLoanAmortisation,
};
