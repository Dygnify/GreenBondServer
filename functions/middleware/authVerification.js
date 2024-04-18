const admin = require("firebase-admin");
const { logger } = require("firebase-functions/v1");

const verifyToken = async (req, res, next) => {
	logger.info("Token validation execution started");
	logger.info(
		`Request url: ${req.url}, body: ${req.body}, params: ${req.query}`
	);
	try {
		if (
			req.url === "/borrower/forgotPassword" ||
			req.url === "/nft/webhook"
		) {
			logger.info(
				"Skipped authentication for forgotPassword and webhook"
			);
			next();
			return;
		}
		const authorizationHeader = req.headers.authorization;
		if (!authorizationHeader) {
			throw new Error("Unauthorized");
		}

		const token = authorizationHeader.split(" ")[1]; // Assuming Bearer token format
		const decodedToken = await admin.auth().verifyIdToken(token);
		req.currentUser = decodedToken; // Attach user information to the request
		logger.info("User executing request: ", decodedToken);
		next();
	} catch (error) {
		return res.status(401).send("Unauthorized");
	}
};

module.exports = { verifyToken };
