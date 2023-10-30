const Joi = require("joi");

const CashFlowParams = Joi.object({
	loanAmount: Joi.number().required().positive().greater(0),
	interestRatePercentage: Joi.number()
		.required()
		.positive()
		.greater(0)
		.max(100),
	tenureInMonths: Joi.number().required().positive().greater(0),
	disbursmentDate: Joi.date().required().format("YYYY-MM-DD"),
	investorUpfrontFees: Joi.number().required().min(0).max(100),
	platformFeesPercentage: Joi.number().required().min(0).max(100),
	JuniorContributionPercentage: Joi.number().required().min(0).max(100),
	JuniorPrincipalFloatPercentage: Joi.number().required().min(0).max(100),
});

module.exports = CashFlowParams;
