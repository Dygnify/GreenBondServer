const Joi = require("joi");

const User = Joi.object({
	email: Joi.string().email().required(),
	profile: Joi.string().required(),
	role: Joi.number().required(),
});

module.exports = User;
