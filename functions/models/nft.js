const Joi = require("joi");

const Nft = Joi.object({
	functionName: Joi.string().required(),
	identity: Joi.string().required(),
	args: Joi.array().required(),
});

module.exports = Nft;
