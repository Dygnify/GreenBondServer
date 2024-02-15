const Joi = require("joi");

const User = Joi.object({
	Id: Joi.string(),
	email: Joi.string().email().required(),
	profile: Joi.string().required(),
	role: Joi.number().required(),
	kycStatus: Joi.bool(),
	action: Joi.string(),
});

module.exports = User;
