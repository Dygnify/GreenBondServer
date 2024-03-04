const Joi = require("joi");

const User = Joi.object({
	Id: Joi.string(),
	email: Joi.string().email().required(),
	password: Joi.string(),
	profile: Joi.string().required(),
	role: Joi.number().required(),
	kycStatus: Joi.bool(),
	action: Joi.string(),
	isNewUser: Joi.bool(),
});

module.exports = User;
