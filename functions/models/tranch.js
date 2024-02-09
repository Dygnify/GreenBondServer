const Joi = require("joi");

const Tranch = Joi.object({
	name: Joi.string().required(),
	percentage: Joi.number().required().min(0).max(100),
	isCommonTranch: Joi.bool().required(),
});

module.exports = Tranch;
