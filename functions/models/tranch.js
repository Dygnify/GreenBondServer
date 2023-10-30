const Joi = require("joi");

const Tranch = Joi.object({
	name: Joi.string().required(),
	percentage: Joi.number().required().positive().greater(0).max(100),
	isCommonTranch: Joi.bool().required(),
});

module.exports = Tranch;
