const Joi = require("joi");

const Transaction = Joi.object({
	bondId: Joi.string().required(),
	bondName: Joi.string().required(),
	amount: Joi.number().required(),
	borrowerTransactionType: Joi.number(),
	investorTransactionType: Joi.number(),
	interestPortion: Joi.string().required(),
	investedOn: Joi.number(),
	isCouponRateDistributionPending: Joi.bool().required(),
	issuerId: Joi.string(),
	subscriberId: Joi.string(),
	principalPortion: Joi.number().required(),
	trxHash: Joi.string().required(),
});

module.exports = Transaction;
