const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Name = sequelize.define(
  "Name",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: "Username",
    timestamps: false,
  }
);

module.exports = Name;
