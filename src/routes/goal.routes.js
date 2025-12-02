const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transaction.controller");

router.get("/get", transactionController.getGoals);
router.post("/create", transactionController.createGoal);
router.patch("/update/:goalId", transactionController.updateGoal);
router.delete("/delete/:goalId", transactionController.deleteGoal);

module.exports = router;
