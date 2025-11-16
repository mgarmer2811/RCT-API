const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Family = require("../models/family.model");
const FamilyUser = require("../models/familyUser.model");

exports.getFamilies = async (req, res, next) => {
  const userId = req.query.userId;
  if (!userId) {
    return res
      .status(400)
      .json({ message: "400 Bad Request. Missing userId in query parameters" });
  }
  try {
    let created = [];
    let joined = [];

    created = await Family.findAll({
      where: { creator_id: userId },
    });

    const joinedRelation = await FamilyUser.findAll({
      where: { user_id: userId },
    });

    const joinedIds = joinedRelation.map(
      (familyUserRow) => familyUserRow.family_id
    );

    if (joinedIds.length > 0) {
      joined = await Family.findAll({
        where: {
          id: joinedIds,
          creator_id: { [Op.ne]: userId },
        },
      });
    }

    return res.status(200).json({
      createdFamilies: created,
      joinedFamilies: joined,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.createFamily = async (req, res, next) => {
  const userId = req.query.userId;
  const { familyName } = req.body;

  if (!userId) {
    return res
      .status(400)
      .json({ message: "400 Bad Request. Missing userId in query parameters" });
  }
  if (familyName.length !== 10) {
    return res.status(400).json({
      message: "400 Bad Request. The family name must be 10 characters long",
    });
  }

  const transaction = await sequelize.transaction();
  try {
    const createdCount = await Family.count({
      where: { creator_id: userId },
      transaction: transaction,
    });
    const joinedCount = await FamilyUser.count({
      where: { user_id: userId },
      include: [
        {
          model: Family,
          attributes: [],
          where: { creator_id: { [Op.ne]: userId } },
          required: true,
        },
      ],
      transaction: transaction,
    });

    if (createdCount + joinedCount >= 3) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: "400 Bad Request. The user already has 3 families" });
    }

    let existing = await Family.findOne({
      where: { name: familyName },
      transaction: transaction,
    });

    if (existing) {
      await transaction.rollback();
      return res.status(400).json({
        message: "400 Bad Request. A family with that name already exists",
      });
    }

    const family = await Family.create(
      {
        name: familyName,
        creator_id: userId,
      },
      { transaction: transaction }
    );
    await FamilyUser.create(
      {
        family_id: family.id,
        user_id: userId,
      },
      { transaction: transaction }
    );
    await transaction.commit();
    return res.status(200).json({ message: "Created family succesfully!" });
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    next(err);
  }
};

exports.joinFamily = async (req, res, next) => {
  const userId = req.query.userId;
  const { familyName } = req.body;

  if (!userId) {
    return res
      .status(400)
      .json({ message: "400 Bad Request. Missing userId in query parameters" });
  }

  if (familyName.length !== 10) {
    return res.status(400).json({
      message: "400 Bad Request. The family name must be 10 characters long",
    });
  }

  const transaction = await sequelize.transaction();
  try {
    const family = await Family.findOne({
      where: { name: familyName },
      transaction: transaction,
    });

    if (!family) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ message: "404 Not Found. Family not found" });
    }

    const alreadyIn = await FamilyUser.findOne({
      where: { family_id: family.id, user_id: userId },
      transaction: transaction,
    });

    if (alreadyIn) {
      await transaction.rollback();
      return res.status(400).json({
        message: "400 Bad Request. The user is already part of the family",
      });
    }

    const createdCount = await Family.count({
      where: { creator_id: userId },
      transaction: transaction,
    });
    const joinedCount = await FamilyUser.count({
      where: { user_id: userId },
      include: [
        {
          model: Family,
          attributes: [],
          where: { creator_id: { [Op.ne]: userId } },
          required: true,
        },
      ],
      transaction: transaction,
    });

    if (createdCount + joinedCount >= 3) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: "400 Bad Request. The user already has 3 families" });
    }

    await FamilyUser.create(
      { family_id: family.id, user_id: userId },
      { transaction: transaction }
    );

    await transaction.commit();
    return res.status(201).json({ message: "Joined the family succesfully!" });
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    next(err);
  }
};

exports.deleteFamily = async (req, res, next) => {
  const userId = req.query.userId;
  const familyId = req.params.familyId;

  if (!userId) {
    return res
      .status(400)
      .json({ message: "400 Bad Request. Missing userId in query parameters" });
  }
  if (!familyId) {
    return res
      .status(400)
      .json({ message: "400 Bad Request. Missing familyId in the request" });
  }

  const transaction = await sequelize.transaction();
  try {
    const id = Number(familyId);
    const family = await Family.findOne({
      where: { id: id },
      transaction: transaction,
    });
    if (!family) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ message: "404 Not Found. Family not found" });
    }

    if (family.creator_id === userId) {
      await Family.destroy({
        where: { id: id },
        transaction: transaction,
      });
      await transaction.commit();
      return res
        .status(200)
        .json({ message: "The family was dissolved succesfully!" });
    } else {
      const deleted = await FamilyUser.destroy({
        where: { family_id: id, user_id: userId },
        transaction: transaction,
      });
      if (!deleted) {
        await transaction.rollback();
        return res.status(400).json({
          message: "400 Bad Request. The user is not part of this family",
        });
      }
      await transaction.commit();
      return res
        .status(200)
        .json({ message: "The user left the family succesfully!" });
    }
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
