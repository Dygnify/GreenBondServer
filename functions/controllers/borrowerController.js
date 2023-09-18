const { logger } = require("firebase-functions/v1");
const {
	createPost: createUser,
} = require("../services/hyperLedgerFunctions/userAsset");

// Create post
exports.createUser = async (req, res) => {
	try {
		// validate the body
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}

		const { error } = Post.validate(req.body);
		if (error) {
			return res.status(400).send(error.details);
		}

		// store in hyperledger
		var result = await createUser(req.body);
		if (result.Id) {
			res.status(201).json(result.Id);
		} else {
			res.status(result.code).json(result.res);
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).send("Invalid request");
};

// Get list of posts
exports.getUsers = (req, res) => {
	res.status(200).json(users);
};
