const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Transaction = require("../models/transaction.model");
const Goal = require("../models/goal.model");
const TransactionGoal = require("../models/transactionGoal.model");
const { computeGoalPayload } = require("../goalRealtime");
const socket = require("../socket");

let payload = {};

exports.getTransactions = async (req, res, next) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(404).json({ message: "404 Bad Request. Missing userId" });
  }

  try {
    const transactions = await Transaction.findAll({
      where: { creator_id: userId },
    });

    return res.status(200).json({ transactions: transactions });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.createTransaction = async (req, res, next) => {
  const userId = req.query.userId;
  const goalId = req.query.goalId;
  const { quantity, category, type, created_at } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "400 Bad Request. Missing userId" });
  }

  const sTransaction = await sequelize.transaction();

  try {
    const transaction = await Transaction.create(
      {
        creator_id: userId,
        quantity: quantity,
        category: category,
        type: type,
        created_at: created_at,
      },
      {
        transaction: sTransaction,
      }
    );

    if (!transaction) {
      await sTransaction.rollback();
      return res.status(500).json({
        message:
          "500 Internal Server error. Unexpected error while creating the transaction",
      });
    }

    if (goalId) {
      await TransactionGoal.create(
        {
          goal_id: Number(goalId),
          transaction_id: transaction.id,
        },
        {
          transaction: sTransaction,
        }
      );
    }

    await sTransaction.commit();

    const userRoom = `user_${userId}`;
    const io = socket.getIo();
    payload = { transaction };
    io.to(userRoom).emit("transaction:created", payload);

    if (goalId) {
      payload = await computeGoalPayload(Number(goalId));
      io.to(userRoom).emit("goal:updated", payload);
    }

    return res
      .status(201)
      .json({ message: "Created transaction successfully!" });
  } catch (err) {
    await sTransaction.rollback();
    console.error(err);
    next(err);
  }
};

exports.updateTransaction = async (req, res, next) => {
  const userId = req.query.userId;
  const transactionId = req.params.transactionId;
  const { quantity, category, type } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "400 Bad Request. Missing userId",
    });
  }

  if (!transactionId) {
    return res
      .status(400)
      .json({ message: "400 Bad Request. Missing transactionId" });
  }

  try {
    const transaction = await Transaction.findOne({
      where: { id: Number(transactionId), creator_id: userId },
    });

    if (!transaction) {
      return res.status(404).json({
        message: "404 Not Found. Transaction (to be updated) not found",
      });
    }

    const tgRelation = await TransactionGoal.findOne({
      where: { transaction_id: Number(transactionId) },
      raw: true,
    });

    const goalId = tgRelation?.goal_id ?? null;

    const results = await Transaction.update(
      {
        quantity: quantity,
        category: category,
        type: type,
      },
      { where: { id: Number(transactionId) }, returning: true }
    );

    if (results[0] === 0) {
      return res.status(500).json({
        message:
          "500 Internal Server error. Unexpected error while updating the transaction",
      });
    }

    const userRoom = `user_${userId}`;
    const io = socket.getIo();
    payload = { transaction: results[1][0] };
    io.to(userRoom).emit("transaction:updated", payload);

    if (goalId) {
      payload = computeGoalPayload(Number(goalId));
      io.to(userRoom).emit("goal:updated", payload);
    }
    return res
      .status(200)
      .json({ message: "Transaction updated successfully!" });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.deleteTransaction = async (req, res, next) => {
  const userId = req.query.userId;
  const transactionId = req.params.transactionId;

  if (!userId) {
    return res.status(404).json({
      message: "400 Bad Request. Missing userId",
    });
  }

  if (!transactionId) {
    return res
      .status(400)
      .json({ message: "400 Bad Request. Missing transactionId" });
  }

  try {
    const tgRelation = await TransactionGoal.findOne({
      where: { transaction_id: Number(transactionId) },
      attributes: ["goal_id"],
      raw: true,
    });

    const goalId = tgRelation?.goal_id ?? null;
    const sTransaction = await sequelize.transaction();

    try {
      if (goalId) {
        await TransactionGoal.destroy({
          where: { transaction_id: Number(transactionId) },
          transaction: sTransaction,
        });
      }

      const deleted = await Transaction.destroy({
        where: { id: Number(transactionId), creator_id: userId },
        transaction: sTransaction,
      });

      if (!deleted) {
        await sTransaction.rollback();
        return res
          .status(404)
          .json({ message: "404 Not Found. Transaction not found" });
      }

      await sTransaction.commit();

      const userRoom = `user_${userId}`;
      const io = socket.getIo();
      payload = { transactionId: Number(transactionId) };
      io.to(userRoom).emit("transaction:deleted", payload);

      if (goalId) {
        payload = await computeGoalPayload(Number(goalId));
        io.to(userRoom).emit("goal:updated", payload);
      }
      return res
        .status(200)
        .json({ message: "Deleted transaction successfully!" });
    } catch (err) {
      await sTransaction.rollback();
      console.error(err);
      next(err);
    }
  } catch (err) {
    console.error(err);
    next(err);
  }
};

/*************************************/

exports.getGoals = async (req, res, next) => {
  const userId = req.query.userId;
  const familyId = req.query.familyId;

  if (!userId) {
    return res
      .status(400)
      .json({ message: "400 Bad Request. Missing userId in query parameters" });
  }

  try {
    const where = {};

    if (familyId) {
      where.family_id = Number(familyId);
    } else {
      where.creator_id = userId;
      where.family_id = { [Op.is]: null };
    }

    const goals = await Goal.findAll({ where });

    const payloads = await Promise.all(goals.map((g) => computeGoalPayload(g)));
    const computedGoals = payloads.filter(Boolean).map((p) => ({
      ...p.goal,
      current: p.current,
      remaining: p.remaining,
      percentDisplayed: p.percentDisplayed,
      barPercent: p.barPercent,
    }));

    return res.status(200).json({ goals: computedGoals });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.createGoal = async (req, res, next) => {
  const userId = req.query.userId;
  const { type, quantity, name } = req.body;

  if (!userId) {
    return res
      .status(400)
      .json({ message: "400 Bad Request. Missing userId in query parameters" });
  }

  try {
    const goal = await Goal.create({
      family_id: null,
      type: type,
      quantity: quantity,
      name: name,
      completed: false,
      creator_id: userId,
      created_at: new Date().toISOString().split("T")[0],
    });

    payload = await computeGoalPayload(goal);
    const userRoom = `user_${userId}`;
    const io = socket.getIo();
    io.to(userRoom).emit("goal:created", payload);

    return res.status(201).json({ message: "Created goal succcesfully!" });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.updateGoal = async (req, res, next) => {
  const userId = req.query.userId;
  const goalId = req.params.goalId;
  const familyId = req.query.familyId;
  const { quantity, completed, name } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "400 Bad Request. Missing userId in query parameters",
    });
  }

  if (!goalId) {
    return res.status(400).json({
      message: "400 Bad Request. Missing goalId in query parameters ",
    });
  }

  try {
    const results = await Goal.update(
      {
        name: name,
        quantity: quantity,
        completed: completed,
      },
      { where: { id: Number(goalId) }, returning: true }
    );

    if (results[0] === 0) {
      return res.status(500).json({
        message:
          "500 Internal Server error. Unexpected error while updating the goal",
      });
    }

    payload = await computeGoalPayload(Number(goalId));
    const io = socket.getIo();

    if (!familyId) {
      const userRoom = `user_${userId}`;
      io.to(userRoom).emit("goal:updated", payload);
    } else {
      const familyRoom = `family_${familyId}`;
      io.to(familyRoom).emit("goal:updated", payload);
    }

    return res.status(200).json({ message: "Updated goal successfully!" });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.deleteGoal = async (req, res, next) => {
  const userId = req.query.userId;
  const goalId = req.params.goalId;

  if (!userId) {
    return res.status(400).json({
      message: "400 Bad Request. Missing userId in query parameters",
    });
  }

  if (!goalId) {
    return res.status(400).json({
      message: "400 Bad Request. Missing goalId in query parameters ",
    });
  }

  try {
    const deleted = await Goal.destroy({
      where: { id: Number(goalId), creator_id: userId },
    });

    if (!deleted) {
      return res
        .status(404)
        .json({ message: "404 Not Found. Goal (to be deleted) not found" });
    }

    const userRoom = `user_${userId}`;
    const io = socket.getIo();
    io.to(userRoom).emit("goal:deleted", { goalId: Number(goalId) });

    return res.status(204).json({ message: "Deleted user goal successfully!" });
  } catch (err) {
    console.error(err);
    next(err);
  }
};
