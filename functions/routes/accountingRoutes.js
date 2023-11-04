const express = require("express");
const {
	getLoanEMI,
	getTermLoanInterestComponentOfEMI,
	getNextRepaymentDate,
	getTranchwiseYieldPercentage,
	getTermLoanAmortisationSchedule,
	getBulletLoanAmortisationSchedule,
} = require("../controllers/accountingController");

const router = express.Router();

router.get("/getLoanEMI", getLoanEMI);
router.get(
	"/getTermLoanInterestComponentOfEMI",
	getTermLoanInterestComponentOfEMI
);
router.get("/getNextRepaymentDate", getNextRepaymentDate);
router.get("/getTranchwiseYieldPercentage", getTranchwiseYieldPercentage);
router.post(
	"/getTermLoanAmortisationSchedule",
	getTermLoanAmortisationSchedule
);
router.post(
	"/getBulletLoanAmortisationSchedule",
	getBulletLoanAmortisationSchedule
);

module.exports = router;
