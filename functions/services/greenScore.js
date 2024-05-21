const { logger } = require("firebase-functions/v1");
const { axiosHttpService } = require("./axioscall");

const getGreenScore = async (email, projectId) => {
	try {
		logger.info("greenScore getGreenScore execution started");
		const scoreOptions = {
			url: `${process.env.GREENSCORE_API_URI}/getScoreData`,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-API-KEY": process.env.GREENSCORE_API_KEY,
			},
			data: {
				email: email,
				projectId: projectId,
			},
		};
		const scoreResult = await axiosHttpService(scoreOptions);
		logger.info("greenScore getGreenScore execution end");
		return scoreResult;
	} catch (error) {
		logger.error(error);
	}
};

module.exports = {
	getGreenScore,
};
