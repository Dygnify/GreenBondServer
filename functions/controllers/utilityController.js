const { logger } = require("firebase-functions/v1");
const { getFirebaseAdminStorage } = require("../firebaseInit");

const getStorageFileSignedURL = async (req, res) => {
	logger.info("utilityController getStorageFileSignedURL execution started");
	try {
		// validate the file path
		if (!req.query || !req.query.filePath) {
			return res.status(400).json("Invalid params");
		}

		// Get a reference to the file
		const fileRef = getFirebaseAdminStorage()
			.bucket()
			.file(req.query.filePath);

		// Set expiration time (in milliseconds)
		const expirationTime = Date.now() + 60000; // 5 Min
		// Generate a signed URL with read permissions
		var url = await fileRef.getSignedUrl({
			action: "read",
			expires: expirationTime,
		});
		logger.info("utilityController getStorageFileSignedURL execution end");
		return res.status(200).json(url);
	} catch (error) {
		logger.error(error);
	}
	res.status(400).json("Invalid request");
};

module.exports = {
	getStorageFileSignedURL,
};
