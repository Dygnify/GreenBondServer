const Joi = require("joi");

const TokenizedBond = Joi.object({
	Id: Joi.string(),
	bondAmount: Joi.number().required(),
	bondId: Joi.string().required(),
	bondInterest: Joi.number().required(),
	bondTenureInMonths: Joi.number().required(),
	bondType: Joi.string().required(),
	emiAmount: Joi.string().required(),
	paymentFrequencyInDays: Joi.number().required(),
	repaymentCounter: Joi.number().required(),
	repaymentStartTime: Joi.number().required(),
	totalOutstandingPrincipal: Joi.number().required(),
	totalRepaidAmount: Joi.number().required(),
	totalRepayments: Joi.number().required(),
	nftId: Joi.string(),
	custodian: Joi.string().email(),
});

module.exports = TokenizedBond;
