const { logger } = require("firebase-functions/v1");
const { axiosHttpService } = require("./axioscall");

const getGreenData = async (projectId) => {
	try {
		logger.info("greenData getGreenData execution started");
		const greenDataOptions = {
			url: `${process.env.GREENDATA_API_URI}/getGreenData`,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-API-KEY": process.env.GREENDATA_API_KEY,
			},
			data: {
				projectId: projectId,
			},
		};
		const greenDataResult = await axiosHttpService(greenDataOptions);
		logger.info("greenData getGreenData execution end");
		return greenDataResult;
	} catch (error) {
		logger.log(error);
	}
};

module.exports = {
	getGreenData,
};
