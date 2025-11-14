const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Family = sequelize.define(
  "Family",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.TEXT,
      unique: true,
      allowNull: false,
    },
    creator_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    tableName: "Family",
    timestamps: false,
  }
);

module.exports = Family;
