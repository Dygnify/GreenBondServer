const { logger } = require("firebase-functions/v1");
const { axiosHttpService } = require("./axioscall");

const getMonitoringData = async (projectId) => {
	try {
		logger.info("monitoringData getMonitoringData execution started");
		const monitoringDataOptions = {
			url: `${process.env.GREENDATA_API_URI}/getGreenMonitoringData`,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-API-KEY": process.env.GREENDATA_API_KEY,
			},
			data: {
				projectId: projectId,
			},
		};
		const monitoringDataResult = await axiosHttpService(
			monitoringDataOptions
		);
		logger.info("monitoringData getMonitoringData execution end");
		return monitoringDataResult;
	} catch (error) {
		logger.error(error);
	}
};

module.exports = {
	getMonitoringData,
};
