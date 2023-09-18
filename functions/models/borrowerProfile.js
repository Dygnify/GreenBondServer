const Joi = require("joi");

const Post = Joi.object({
	userId: Joi.string().required(),
	ticker: Joi.string().required(),
	timeStamp: Joi.number().required(),
	stopLoss: Joi.number().required(),
	target: Joi.number().required(),
	tradeType: Joi.number().required(),
	price: Joi.number().required(),
	isComplete: Joi.bool().required(),
});

module.exports = Post;
