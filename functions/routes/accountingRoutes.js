const express = require("express");
const {
	getLoanEMI,
	getTermLoanInterestComponentOfEMI,
	getNextRepaymentDate,
	getTranchwiseYieldPercentage,
	getAmortisationSchedule,
} = require("../controllers/accountingController");

const router = express.Router();

router.get("/getLoanEMI", getLoanEMI);
router.get(
	"/getTermLoanInterestComponentOfEMI",
	getTermLoanInterestComponentOfEMI
);
router.get("/getNextRepaymentDate", getNextRepaymentDate);
router.get("/getTranchwiseYieldPercentage", getTranchwiseYieldPercentage);
router.get("/getAmortisationSchedule", getAmortisationSchedule);

module.exports = router;
