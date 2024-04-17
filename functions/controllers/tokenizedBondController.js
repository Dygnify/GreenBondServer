const { logger } = require("firebase-functions/v1");
const {
	createTokenized,
	getTokenized,
} = require("../services/hyperLedgerFunctions/tokenizedBond");
const TokenizedBond = require("../models/tokenizedBond");
const {
	getAllBondsWithStatus,
} = require("../services/hyperLedgerFunctions/greenBond");
const {
	getNextRepaymentDate,
	calculateDateDifferenceInDays,
} = require("../helper/dateFunctions");
const { sendEmail } = require("../services/emailHelper");
const {
	getUser,
	getAllUser,
} = require("../services/hyperLedgerFunctions/userAsset");
const { formatCurrency } = require("../services/helper/helperFunctions");

// Create Transaction
const createTokenizedBond = async (req, res) => {
	logger.info("createTokenizedBond execution started");
	try {
		// validate the body
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}
		logger.info("TokenizedBond Data received: ", req.body);

		const { error } = TokenizedBond.validate(req.body);
		if (error) {
			logger.error("TokenizedBond validation failed: ", error);
			return res.status(400).send(error.details);
		}

		// store in hyperledger
		var result = await createTokenized(req.body);
		if (result.Id) {
			logger.info(
				"TokenizedBond successfuly created with id: ",
				result.Id
			);
			return res.status(201).json(result.Id);
		} else {
			logger.error("Failed to create TokenizedBond");
			return res.status(result.code).json(result.res);
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).send("Invalid request");
};

const getTokenizedBond = async (req, res) => {
	logger.info("getTokenizedBond execution started");
	try {
		if (!req.body) {
			logger.error("Invalid request data");
			response.status(400).send("Invalid data");
		}

		var result = await getTokenized(req.body.field, req.body.value);
		if (result) {
			logger.info("TokenizedBond found: ", result);
			return res.status(200).json(result);
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).json("Invalid request");
};

const getAllTokenizedBond = async (req, res) => {
	logger.info("getAllTokenizedBond execution started");
	try {
		//status 5 represents the tokenized bonds
		var result = await getAllBondsWithStatus(5);
		if (result) {
			logger.info("TokenizedBonds found: ", result);
			return res.status(200).json(result);
		}
	} catch (error) {
		logger.error(error);
	}
	res.status(400).json("Invalid request");
};

const sendDueDateReminderMail = async () => {
	logger.info("sendDueDateReminderMail started");
	try {
		// get all the tokenized bonds
		var res = await getAllBondsWithStatus(5);
		logger.info("Tokenized Green Bonds: ", res);
		if (!res.data.GreenBond || res.data.GreenBond.length <= 0) {
			return;
		}
		//get the tokenized bond details
		for (const bond of res.data.GreenBond) {
			try {
				const tokenRes = await getTokenized("bondId", bond.Id);
				logger.info("Tokenized Bond details: ", tokenRes);
				if (
					!tokenRes ||
					!tokenRes.records[0] ||
					!tokenRes.records[0].data
				) {
					continue;
				}
				const tokenizedBond = tokenRes.records[0].data;
				var { repaymentDate, repaymentDisplayDate } =
					getNextRepaymentDate(
						tokenizedBond.repaymentStartTime,
						tokenizedBond.repaymentCounter,
						tokenizedBond.paymentFrequencyInDays
					);

				//send before 5,1 and on due date
				const dayDiff = calculateDateDifferenceInDays(
					repaymentDate,
					Date.now()
				);
				logger.info(
					`Repayment Date: ${repaymentDisplayDate} and due date diff: ${dayDiff}`
				);
				if (dayDiff === 5 || dayDiff === 3 || dayDiff === 0) {
					const res = await getUser(bond.borrowerId.toString());
					logger.info("Get user response: ", res);
					const profile = JSON.parse(res.data.profile);
					const companyName = profile.companyName;

					// Get admins
					let admins = [];
					const adminResult = await getAllUser();

					adminResult.records.forEach((user) => {
						if (user.data.role === 4) {
							admins.push(user.data.email);
						}
					});

					const mainBody = `<!-- START MAIN CONTENT AREA -->
					<tr>
					<td class="wrapper">
					<p>Dear ${companyName},</p>
					<p>The Green bond ${bond.loan_name} repayment of ${
						process.env.CURRENCY_SYMBOL
					}${formatCurrency(
						tokenizedBond.emiAmount
					)} is due on ${repaymentDisplayDate}.</p>
					<p>Kindly make the repayment on or before the due date.</p>
					<p>Thanks,<br/>Team Project iGreen</p>  
					</td>
					</tr>`;

					await sendEmail(
						res.data.email,
						"Project iGreen - Green Bond repayment due",
						mainBody,
						profile.email,
						admins
					);
				}
			} catch (error) {
				logger.error(error);
			}
		}
	} catch (error) {
		logger.error(error);
	}
};

module.exports = {
	createTokenizedBond,
	getTokenizedBond,
	getAllTokenizedBond,
	sendDueDateReminderMail,
};
