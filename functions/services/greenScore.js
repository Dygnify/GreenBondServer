const { axiosHttpService } = require("./axioscall");

const getGreenScore = async (email, projectId) => {
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
	return scoreResult;
};

module.exports = {
	getGreenScore,
};
