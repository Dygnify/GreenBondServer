const Joi = require("joi");

const Loan = Joi.object({
	loanAmount: Joi.number().required().positive().greater(0),
	interestRate: Joi.number().required().positive().greater(0).max(100),
	tenureInMonths: Joi.number().required().positive().greater(0),
	repaymentFrequency: Joi.number().required().positive().greater(0),
	isTermLoan: Joi.bool().required(),
});

module.exports = Loan;
