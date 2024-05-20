const { axiosHttpService } = require("./axioscall");

const getMonitoringData = async (projectId) => {
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
	const monitoringDataResult = await axiosHttpService(monitoringDataOptions);
	return monitoringDataResult;
};

module.exports = {
	getMonitoringData,
};
