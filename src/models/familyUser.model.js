const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Family = require("./family.model");

const FamilyUser = sequelize.define(
  "FamilyUser",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    family_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Family,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    tableName: "Family_User",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["family_id", "user_id"],
      },
    ],
  }
);

module.exports = FamilyUser;
