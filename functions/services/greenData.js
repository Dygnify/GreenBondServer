const { axiosHttpService } = require("./axioscall");

const getGreenData = async (projectId) => {
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
	return greenDataResult;
};

module.exports = {
	getGreenData,
};
