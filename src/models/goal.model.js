const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Goal = sequelize.define(
  "Goal",
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
    family_id: {
      type: DataTypes.INTEGER,
    },
    type: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL,
      allowNull: false,
    },
    completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  },
  {
    tableName: "Goal",
    timestamps: false,
  }
);

module.exports = Goal;
