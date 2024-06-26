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
	txHash: Joi.string().required(),
	isSenior: Joi.bool(),
	repaymentNumber: Joi.number(),
	benificiaryName: Joi.string().required(),
	benificiaryBank: Joi.string().required(),
	benificiaryBankAccNo: Joi.string().required(),
	utrNo: Joi.string().required(),
	transactionDate: Joi.string(),
	status: Joi.number().required(),
	action: Joi.string(),
});

module.exports = Transaction;
