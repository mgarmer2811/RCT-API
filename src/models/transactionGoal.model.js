const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const TransactionGoal = sequelize.define(
  "TransactionGoal",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    goal_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    transaction_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "Transaction_Goal",
    timestamps: false,
  }
);

module.exports = TransactionGoal;
