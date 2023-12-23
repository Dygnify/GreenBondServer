const express = require("express");
const functions = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { initializeFirebaseApp } = require("./firebaseInit");
const userRoutes = require("./routes/userRoutes");
const bondRoutes = require("./routes/bondRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const tokenizedBondRoutes = require("./routes/tokenizedBondRoutes");
const accountingRoutes = require("./routes/accountingRoutes");
const app = express();
const cors = require("cors");

initializeFirebaseApp();

app.use(express.json());
app.use(
	cors({
		allowedHeaders: ["Content-Type"],
	})
);
app.use("/borrower", userRoutes);
app.use("/bond", bondRoutes);
app.use("/transaction", transactionRoutes);
app.use("/tokenizedBond", tokenizedBondRoutes);
app.use("/accounting", accountingRoutes);

exports.api = functions.region("asia-south1").https.onRequest(app);
