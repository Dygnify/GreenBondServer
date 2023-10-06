const Joi = require("joi");

const Transaction = Joi.object({
	Id: Joi.string(),
	bondId: Joi.string().required(),
	bondName: Joi.string().required(),
	amount: Joi.number().required(),
	borrowerTransactionType: Joi.number(),
	investorTransactionType: Joi.number(),
	interestPortion: Joi.string(),
	investedOn: Joi.number(),
	isCouponRateDistributionPending: Joi.bool(),
	issuerId: Joi.string(),
	subscriberId: Joi.string(),
	principalPortion: Joi.number(),
	trxHash: Joi.string().required(),
});

module.exports = Transaction;
