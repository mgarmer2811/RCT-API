const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transaction.controller");

router.get("/get", transactionController.getTransactions);
router.get("/get/tg", transactionController.getTransactionGoals);
router.post("/create", transactionController.createTransaction);
router.patch("/update/:transactionId", transactionController.updateTransaction);
router.delete(
  "/delete/:transactionId",
  transactionController.deleteTransaction
);

module.exports = router;
