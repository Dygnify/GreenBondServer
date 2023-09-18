const express = require("express");
const functions = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const borrowerRoutes = require("./routes/borrowerRoutes");
const app = express();
const cors = require("cors");
admin.initializeApp();
app.use(express.json());
app.use(
	cors({
		allowedHeaders: ["Content-Type"],
	})
);
app.use("/borrower", borrowerRoutes);

exports.api = functions.https.onRequest(app);
