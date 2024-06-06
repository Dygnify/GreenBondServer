const { logger } = require("firebase-functions/v1");

const Role = {
	Subscriber: 0,
	Issuer: 1,
	Custodian: 2,
	Regulator: 3,
	Admin: 4,
	DiligenceExpert: 5,
};

const getUserCompanyName = (user) => {
	try {
		const profile = JSON.parse(user.profile);
		const companyName = profile.companyName;
		return companyName;
	} catch (error) {
		logger.error(error);
	}
};

module.exports = { Role, getUserCompanyName };
