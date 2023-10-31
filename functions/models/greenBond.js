const Joi = require("joi");

const GreenBond = Joi.object({
	Id: Joi.string(),
	borrowerId: Joi.string().required(),
	capital_loss: Joi.string(),
	collateralHash: Joi.string().required(),
	collateral_document_description: Joi.string().required(),
	collateral_document_name: Joi.string().required(),
	collateral_filename: Joi.string().required(),
	companyDetails: Joi.string().required(),
	loan_amount: Joi.string().required(),
	loan_interest: Joi.string().required(),
	loan_name: Joi.string().required(),
	loan_purpose: Joi.string().required(),
	loan_tenure: Joi.number().required(),
	loan_type: Joi.number().required(),
	payment_frequency: Joi.number().required(),
	status: Joi.number().required(),
	createdOn: Joi.number().required(),
});

module.exports = GreenBond;