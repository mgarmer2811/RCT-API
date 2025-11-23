const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transaction.controller");

router.get("/get", transactionController.getUserGoals);
router.post("/create", transactionController.createUserGoal);
router.patch("/update/:goalId", transactionController.updateUserGoal);
router.delete("/delete/:goalId", transactionController.deleteUserGoal);

module.exports = router;
