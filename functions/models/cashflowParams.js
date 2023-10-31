const Joi = require("joi");

const dateRegexPattern = new RegExp(
	/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
);

const CashFlowParams = Joi.object({
	loanAmount: Joi.number().required().positive().greater(0),
	interestRatePercentage: Joi.number()
		.required()
		.positive()
		.greater(0)
		.max(100),
	tenureInMonths: Joi.number().required().positive().greater(0),
	disbursmentDate: Joi.string().required().regex(dateRegexPattern),
	investorUpfrontFees: Joi.number().required().min(0).max(100),
	platformFeesPercentage: Joi.number().required().min(0).max(100),
	JuniorContributionPercentage: Joi.number().required().min(0).max(100),
	JuniorPrincipalFloatPercentage: Joi.number().required().min(0).max(100),
});

module.exports = CashFlowParams;
