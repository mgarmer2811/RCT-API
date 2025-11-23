const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Transaction = sequelize.define(
  "Transaction",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    creator_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL,
      allowNull: false,
    },
    category: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  },
  {
    tableName: "Transaction",
    timestamps: false,
  }
);

module.exports = Transaction;
