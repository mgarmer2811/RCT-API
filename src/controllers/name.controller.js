const { Op } = require("sequelize");
const Name = require("../models/name.model");

exports.getName = async (req, res, next) => {
  const userId = req.query.userId;
  if (!userId) {
    return res
      .status(400)
      .json({ message: "400 Bad Request. Missing userId in query parameters" });
  }

  try {
    const user = await Name.findOne({
      where: { user_id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "404 Not Found. Name not found" });
    }

    return res.status(200).json({ name: user.name });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.createName = async (req, res, next) => {
  const userId = req.query.userId;
  const { name } = req.body;

  if (!userId) {
    return res
      .status(400)
      .json({ message: "400 Bad Request. Missing userId in query parameters" });
  }
  try {
    await Name.create({
      name: name,
      user_id: userId,
    });
    return res.status(201).json({ message: "Username assigned correctly" });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.changeName = async (req, res, next) => {
  const userId = req.query.userId;
  const { name } = req.body;

  if (!userId) {
    return res
      .status(400)
      .json({ message: "400 Bad Request. Missing userId in query parameters" });
  }
  if (name.length > 15 || name.length < 5) {
    return res.status(400).json({
      message: "400 Bad Request. The username must be 5-15 characters long",
    });
  }

  try {
    const results = await Name.update(
      {
        name: name,
      },
      {
        where: { user_id: userId },
        returning: true,
      }
    );

    if (results[0] === 0) {
      return res.status(500).json({
        message:
          "500 Internal Server error. Unexpected error while updating the username",
      });
    }

    const newUsername = results[1][0].name;
    return res.status(200).json({ name: newUsername });
  } catch (err) {
    console.error(err);
    next(err);
  }
};
