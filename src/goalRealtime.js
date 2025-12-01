const socket = require("./socket");
const Transaction = require("../src/models/transaction.model");
const TransactionGoal = require("../src/models/transactionGoal.model");
const Goal = require("../src/models/goal.model");

async function computeGoalPayload(goal) {
  const goalId = typeof goal === "object" ? goal.id : goal;

  const tgs = await TransactionGoal.findAll({
    where: { goal_id: goalId },
    attributes: ["transaction_id"],
    raw: true,
  });

  const transactionIds = tgs.map((tg) => tg.transaction_id).filter(Boolean);

  let current = 0;
  if (transactionIds.length > 0) {
    const sum = await Transaction.sum("quantity", {
      where: { id: transactionIds },
    });
    current = parseFloat(sum) || 0;
  }

  let goalObj = goal;
  if (typeof goal !== "object") {
    goalObj = await Goal.findByPk(goalId);
  }

  if (!goalObj) {
    return null;
  }

  const quantity = parseFloat(goalObj.quantity) || 0;
  const isBudget = goalObj.type;
  const remaining = isBudget ? Math.max(0, quantity - current) : null;
  const percentDisplayed =
    quantity === 0 ? 0 : Math.max(0, Math.min(100, (current / quantity) * 100));

  const barPercent =
    quantity === 0
      ? 0
      : isBudget
      ? Math.max(0, Math.min(100, (remaining / quantity) * 100))
      : Math.max(0, Math.min(100, (current / quantity) * 100));

  const payload = {
    current,
    remaining,
    percentDisplayed,
    barPercent,
    goal: {
      id: goalObj.id,
      quantity: goalObj.quantity,
      name: goalObj.name,
      type: goalObj.type,
      completed: goalObj.completed,
      creator_id: goalObj.creator_id,
      family_id: goalObj.family_id,
      created_at: goalObj.created_at,
    },
  };
  return payload;
}

module.exports = { computeGoalPayload };
