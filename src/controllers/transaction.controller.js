const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Transaction = require("../models/transaction.model");
const Goal = require("../models/goal.model");
const TransactionGoal = require("../models/transactionGoal.model");
const Name = require("../models/name.model");
const { computeGoalPayload } = require("../goalRealtime");
const socket = require("../socket");

let payload = {};

exports.getTransactions = async (req, res, next) => {
  const userId = req.query.userId;

  if (userId) {
    try {
      const transactions = await Transaction.findAll({
        where: { creator_id: userId },
      });

      return res.status(200).json({ transactions: transactions });
    } catch (err) {
      console.error(err);
      next(err);
    }
  } else {
    try {
      const transactions = await Transaction.findAll();

      return res.status(200).json({ transactions: transactions });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
};

exports.createTransaction = async (req, res, next) => {
  const userId = req.query.userId;
  const goalId = req.query.goalId;
  const familyId = req.query.familyId;
  const { quantity, category, type, created_at } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "400 Bad Request. Missing userId" });
  }

  const sTransaction = await sequelize.transaction();

  try {
    const transaction = await Transaction.create(
      {
        creator_id: userId,
        quantity,
        category,
        type,
        created_at,
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

    let createdTG = null;
    if (goalId) {
      createdTG = await TransactionGoal.create(
        {
          goal_id: Number(goalId),
          transaction_id: transaction.id,
        },
        { transaction: sTransaction }
      );
    }

    await sTransaction.commit();

    const io = socket.getIo();
    const transactionPayload = { transaction, transactionGoal: createdTG };
    const targetRoom = familyId ? `family_${familyId}` : `user_${userId}`;

    if (createdTG) {
      io.to(targetRoom).emit("transactionGoal:created", {
        transactionGoal: createdTG,
      });
    }

    io.to(targetRoom).emit("transaction:created", transactionPayload);

    if (goalId) {
      const goalPayload = await computeGoalPayload(goalId);
      io.to(targetRoom).emit("goal:updated", goalPayload);
    }

    return res.status(201).json({
      message: "Created transaction successfully!",
      transaction,
      transactionGoal: createdTG,
    });
  } catch (err) {
    await sTransaction.rollback();
    console.error(err);
    next(err);
  }
};

exports.updateTransaction = async (req, res, next) => {
  const userId = req.query.userId ?? null;
  const familyId = req.query.familyId ?? null;
  const transactionId = req.params.transactionId;
  const { quantity, category, type } = req.body;

  if (!transactionId) {
    return res
      .status(400)
      .json({ message: "400 Bad Request. Missing transactionId" });
  }

  try {
    const transaction = await Transaction.findOne({
      where: { id: Number(transactionId) },
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
        category: category ?? transaction.category,
        type: type ?? transaction.type,
      },
      { where: { id: Number(transactionId) }, returning: true }
    );

    if (!results || results[0] === 0) {
      return res.status(500).json({
        message:
          "500 Internal Server error. Unexpected error while updating the transaction",
      });
    }

    const updatedTransaction = (results[1] && results[1][0]) || null;

    const io = socket.getIo();

    if (userId) {
      const userRoom = `user_${userId}`;
      const payload = { transaction: updatedTransaction };
      io.to(userRoom).emit("transaction:updated", payload);
      if (goalId) {
        const goalPayload = await computeGoalPayload(Number(goalId));
        io.to(userRoom).emit("goal:updated", goalPayload);
      }
    }

    if (familyId) {
      const familyRoom = `family_${familyId}`;
      const payload = { transaction: updatedTransaction };
      io.to(familyRoom).emit("transaction:updated", payload);
      if (goalId) {
        const goalPayload = await computeGoalPayload(Number(goalId));
        io.to(familyRoom).emit("goal:updated", goalPayload);
      }
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
  const userId = req.query.userId ?? null;
  const familyId = req.query.familyId ?? null;
  const transactionId = req.params.transactionId;

  if (!transactionId) {
    return res
      .status(400)
      .json({ message: "400 Bad Request. Missing transactionId" });
  }

  try {
    const tgRelation = await TransactionGoal.findOne({
      where: { transaction_id: Number(transactionId) },
      attributes: ["id", "goal_id", "transaction_id"],
      raw: true,
    });

    const goalId = tgRelation?.goal_id ?? null;
    const tgId = tgRelation?.id ?? null;

    const sTransaction = await sequelize.transaction();

    try {
      if (tgRelation) {
        await TransactionGoal.destroy({
          where: { transaction_id: Number(transactionId) },
          transaction: sTransaction,
        });
      }

      const deletedCount = await Transaction.destroy({
        where: { id: Number(transactionId) },
        transaction: sTransaction,
      });

      if (!deletedCount) {
        await sTransaction.rollback();
        return res
          .status(404)
          .json({ message: "404 Not Found. Transaction not found" });
      }

      await sTransaction.commit();
      const io = socket.getIo();

      const txDeletedPayload = { transactionId: Number(transactionId) };

      if (userId) {
        const userRoom = `user_${userId}`;
        io.to(userRoom).emit("transaction:deleted", txDeletedPayload);
      }

      if (familyId) {
        const familyRoom = `family_${familyId}`;
        io.to(familyRoom).emit("transaction:deleted", txDeletedPayload);
      }

      if (tgId || goalId) {
        const tgDeletedPayload = {
          id: tgId ?? null,
          transaction_id: Number(transactionId),
          goal_id: goalId ?? null,
        };

        if (userId) {
          const userRoom = `user_${userId}`;
          io.to(userRoom).emit("transactionGoal:deleted", tgDeletedPayload);
        }
        if (familyId) {
          const familyRoom = `family_${familyId}`;
          io.to(familyRoom).emit("transactionGoal:deleted", tgDeletedPayload);
        }

        if (goalId) {
          const goalPayload = await computeGoalPayload(Number(goalId));
          if (userId) io.to(`user_${userId}`).emit("goal:updated", goalPayload);
          if (familyId)
            io.to(`family_${familyId}`).emit("goal:updated", goalPayload);
        }
      }

      // Return deleted id too (helpful for debug or non-socket fallback)
      return res.status(200).json({
        message: "Deleted transaction successfully!",
        transactionId: Number(transactionId),
      });
    } catch (err) {
      await sTransaction.rollback();
      console.error("deleteTransaction inner error:", err);
      next(err);
    }
  } catch (err) {
    console.error("deleteTransaction outer error:", err);
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

    const creatorIds = [
      ...new Set(
        computedGoals
          .map((g) => g.creator_id ?? g.created_by ?? g.user_id)
          .filter(Boolean)
          .map(String)
      ),
    ];

    let nameMap = {};
    if (creatorIds.length > 0) {
      const names = await Name.findAll({
        where: { user_id: creatorIds },
        attributes: ["user_id", "name"],
      });

      nameMap = names.reduce((acc, n) => {
        acc[String(n.user_id)] = n.name;
        return acc;
      }, {});
    }

    const goalsWithNames = computedGoals.map((g) => {
      const key = String(g.creator_id ?? g.created_by ?? g.user_id ?? "");
      return {
        ...g,
        creatorName: nameMap[key] ?? null,
      };
    });

    return res.status(200).json({ goals: goalsWithNames });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.createGoal = async (req, res, next) => {
  const userId = req.query.userId;
  const familyId = req.query.familyId ?? null;

  const { type, quantity, name } = req.body;

  if (!userId) {
    return res
      .status(400)
      .json({ message: "400 Bad Request. Missing userId in query parameters" });
  }

  try {
    const goal = await Goal.create({
      family_id: familyId ? familyId : null,
      type: type,
      quantity: quantity,
      name: name,
      completed: false,
      creator_id: userId,
      created_at: new Date().toISOString().split("T")[0],
    });

    const payload = await computeGoalPayload(goal);
    const io = socket.getIo();

    const userRoom = `user_${userId}`;
    io.to(userRoom).emit("goal:created", payload);

    if (familyId) {
      const familyRoom = `family_${familyId}`;
      io.to(familyRoom).emit("goal:created", payload);
    }

    return res.status(201).json(payload);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.updateGoal = async (req, res, next) => {
  const userId = req.query.userId;
  const goalId = req.params.goalId;
  const familyId = req.query.familyId;
  const { quantity, name } = req.body;

  if (!userId) {
    return res
      .status(400)
      .json({ message: "400 Bad Request. Missing userId in query parameters" });
  }
  if (!goalId) {
    return res.status(400).json({
      message: "400 Bad Request. Missing goalId in query parameters ",
    });
  }

  try {
    const results = await Goal.update(
      { name, quantity },
      { where: { id: Number(goalId), creator_id: userId }, returning: true }
    );

    if (!results || results[0] === 0) {
      return res.status(500).json({
        message:
          "500 Internal Server error. Unexpected error while updating the goal",
      });
    }

    let updatedGoalRow = results[1] && results[1][0] ? results[1][0] : null;
    if (!updatedGoalRow) {
      updatedGoalRow = await Goal.findByPk(Number(goalId));
    }

    const updatedGoalPlain =
      updatedGoalRow && typeof updatedGoalRow.get === "function"
        ? updatedGoalRow.get({ plain: true })
        : updatedGoalRow;

    const computedValues = await computeGoalPayload(Number(goalId));
    if (!computedValues) {
      const payload = { goal: updatedGoalPlain };
      const io = socket.getIo();
      const room = familyId ? `family_${familyId}` : `user_${userId}`;
      io.to(room).emit("goal:updated", payload);
      return res
        .status(200)
        .json({ message: "Updated goal successfully!", payload });
    }

    const computedCompleted = computedValues.goal?.completed;
    if (
      typeof computedCompleted !== "undefined" &&
      updatedGoalPlain &&
      updatedGoalPlain.completed !== computedCompleted
    ) {
      await Goal.update(
        { completed: computedCompleted },
        { where: { id: Number(goalId) } }
      );
      updatedGoalPlain.completed = computedCompleted;
      computedValues.goal = { ...computedValues.goal, ...updatedGoalPlain };
    } else {
      computedValues.goal = { ...computedValues.goal, ...updatedGoalPlain };
    }

    const payload = computedValues;
    const io = socket.getIo();
    const room = familyId ? `family_${familyId}` : `user_${userId}`;
    io.to(room).emit("goal:updated", payload);
    return res
      .status(200)
      .json({ message: "Updated goal successfully!", payload });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.deleteGoal = async (req, res, next) => {
  const userId = req.query.userId;
  const goalId = req.params.goalId;
  const familyId = req.params.familyId;

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
        .json({ message: "400 Bad Request. User is not creator of the goal" });
    }

    const userRoom = familyId ? `family_${familyId}` : `user_${userId}`;
    const io = socket.getIo();
    io.to(userRoom).emit("goal:deleted", { goalId: Number(goalId) });

    return res.status(204).json({ message: "Deleted user goal successfully!" });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getTransactionGoals = async (req, res, next) => {
  try {
    const transactionGoals = await TransactionGoal.findAll();

    return res.status(200).json({ transactionGoals: transactionGoals });
  } catch (err) {
    console.error(err);
    next(err);
  }
};
