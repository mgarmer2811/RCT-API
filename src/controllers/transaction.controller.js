const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Transaction = require("../models/transaction.model");
const Goal = require("../models/goal.model");
const TransactionGoal = require("../models/transactionGoal.model");

exports.getTransactions = async (req, res, next) => {
  const userId = req.query.userId;
  if (!userId) {
    return res
      .status(400)
      .json({ message: "400 Bad Request. Missing userId in query parameters" });
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
  const { quantity, category, type } = req.body;

  if (!userId) {
    return res
      .status(400)
      .json({ message: "400 Bad Request. Missing userId in query parameters" });
  }

  if (goalId) {
    const sTransaction = await sequelize.transaction();
    try {
      const transaction = await Transaction.create(
        {
          creator_id: userId,
          quantity: quantity,
          category: category,
          type: type,
          created_at: new Date().toISOString().split("T")[0],
        },
        { transaction: sTransaction }
      );

      if (!transaction) {
        await sTransaction.rollback();
        return res.status(500).json({
          message:
            "500 Internal Server error. Unexpected error while creating the transaction",
        });
      }

      await TransactionGoal.create(
        {
          goal_id: goalId,
          transaction_id: transaction.id,
        },
        { transaction: sTransaction }
      );
      await transaction.commit();
      return res.status(201).json({
        message: "Created transaction and transactionGoal successfully!",
      });
    } catch (err) {
      await sTransaction.rollback();
      console.error(err);
      next(err);
    }
  } else {
    try {
      const transaction = await Transaction.create({
        creator_id: userId,
        quantity: quantity,
        category: category,
        type: type,
        created_at: new Date().toISOString().split("T")[0],
      });

      return res
        .status(201)
        .json({ message: "Created transaction sucessfully!" });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
};

exports.updateTransaction = async (req, res, next) => {
  const userId = req.query.userId;
  const transactionId = req.params.transactionId;
  const { quantity, category, type, created_at } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "400 Bad Request. Missing userId in query parameters",
    });
  }

  if (!transactionId) {
    return res
      .status(400)
      .json({ message: "404 Not Found. Transaction id not found" });
  }

  try {
    const transaction = await Transaction.findOne({
      where: { id: transactionId, creator_id: userId },
    });

    if (!transaction) {
      return res.status(400).json({
        message: "404 Not Found. Transaction (to be updated) not found",
      });
    }

    const results = await Transaction.update(
      {
        quantity: quantity,
        category: category,
        type: type,
        created_at: created_at,
      },
      { where: { id: transactionId }, returning: true }
    );

    if (results[0] === 0) {
      return res.status(500).json({
        message:
          "500 Internal Server error. Unexpected error while updating the transaction",
      });
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
  const goalId = req.query.goalId;
  const transactionId = req.params.transactionId;

  if (!userId) {
    return res.status(400).json({
      message: "400 Bad Request. Missing userId in query parameters",
    });
  }

  if (!transactionId) {
    return res
      .status(400)
      .json({ message: "404 Not Found. Transaction id not found" });
  }

  if (goalId) {
    const sTransaction = await sequelize.transaction();
    try {
      const deleted = await Transaction.destroy({
        where: { id: transactionId, creator_id: userId },
        transaction: sTransaction,
      });

      if (!deleted) {
        await sTransaction.rollback();
        return res
          .status(404)
          .json({ message: "404 Not Found. Transaction not found" });
      }

      await TransactionGoal.destroy({
        where: { goal_id: goalId, transaction_id: transactionId },
        transaction: sTransaction,
      });
      return res
        .status(204)
        .json({ message: "Transaction deleted successfully!" });
    } catch (err) {
      await sTransaction.rollback();
      console.error(err);
      next(err);
    }
  } else {
    try {
      const transaction = await Transaction.findOne({
        where: { id: transactionId, creator_id: userId },
      });

      if (!transaction) {
        return res.status(400).json({
          message: "404 Not Found. Transaction (to be deleted) not found",
        });
      }

      const deleted = await Transaction.destroy({
        where: { id: transactionId },
      });
      return res
        .status(200)
        .json({ message: "Transaction deleted successfully!" });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
};

/*************************************/

exports.getUserGoals = async (req, res, next) => {
  const userId = req.query.userId;
  if (!userId) {
    return res
      .status(400)
      .json({ message: "400 Bad Request. Missing userId in query parameters" });
  }

  try {
    const goals = await Goal.findAll({
      where: { creator_id: userId, family_id: { [Op.is]: null } },
    });

    return res.status(200).json({ goals: goals });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.createUserGoal = async (req, res, next) => {
  const userId = req.query.userId;
  const { type, quantity } = req.body;

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
      completed: false,
      creator_id: userId,
    });

    return res.status(201).json({ message: "Created goal succcesfully!" });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.updateUserGoal = async (req, res, next) => {
  const userId = req.query.userId;
  const goalId = req.params.goalId;
  const { quantity, completed, type } = req.body;

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
        type: type,
        quantity: quantity,
        completed: completed,
      },
      { where: { id: goalId, creator_id: userId }, returning: true }
    );

    if (results[0] === 0) {
      return res.status(500).json({
        message:
          "500 Internal Server error. Unexpected error while updating the goal",
      });
    }

    return res.status(200).json({ message: "Updated goal successfully!" });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.deleteUserGoal = async (req, res, next) => {
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
      where: { id: goalId, creator_id: userId },
    });

    if (!deleted) {
      return res
        .status(404)
        .json({ message: "404 Not Found. Goal (to be deleted) not found" });
    }
    return res.status(204).json({ message: "Deleted user goal successfully!" });
  } catch (err) {
    console.error(err);
    next(err);
  }
};
