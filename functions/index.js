const express = require("express");
const functions = require("firebase-functions");
const { initializeFirebaseApp } = require("./firebaseInit");
const userRoutes = require("./routes/userRoutes");
const bondRoutes = require("./routes/bondRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const tokenizedBondRoutes = require("./routes/tokenizedBondRoutes");
const accountingRoutes = require("./routes/accountingRoutes");
const nftRoutes = require("./routes/nftRoutes");
const app = express();
const cors = require("cors");
const {
	sendDueDateReminderMail,
} = require("./controllers/tokenizedBondController");
const { verifyToken } = require("./middleware/authVerification");

initializeFirebaseApp();

app.use(express.json());
app.use(
	cors({
		origin: process.env.DEPLOYED_APP_URL,
		allowedHeaders: ["Content-Type", "Authorization"],
	})
);
app.use(verifyToken);
app.use("/borrower", userRoutes);
app.use("/bond", bondRoutes);
app.use("/transaction", transactionRoutes);
app.use("/tokenizedBond", tokenizedBondRoutes);
app.use("/accounting", accountingRoutes);
app.use("/nft", nftRoutes);

exports.api = functions.region("asia-southeast1").https.onRequest(app);

// This function runs every day at 1 AM IST
exports.scheduledDueDateReminder = functions
	.region("asia-southeast1")
	.pubsub.schedule("30 5 * * *")
	.onRun(async (context) => {
		console.log("scheduledDueDateReminder started");
		sendDueDateReminderMail();
	});
