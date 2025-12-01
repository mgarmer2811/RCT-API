require("dotenv").config();
const http = require("http");
const app = require("./app");
const sequelize = require("./config/database");
const PORT = process.env.PORT || 5050;

const socket = require("./socket");

const Family = require("./models/family.model");
const FamilyUser = require("./models/familyUser.model");
Family.hasMany(FamilyUser, { foreignKey: "family_id", onDelete: "CASCADE" });
FamilyUser.belongsTo(Family, { foreignKey: "family_id" });

async function start() {
  try {
    await sequelize.authenticate();
    console.log("Connected to supabase!");
    await sequelize.sync({
      alter: true,
    });
    console.log("Models synchronized succesfully!");

    const server = http.createServer(app);
    socket.init(server);

    server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start the server\n", err);
    process.exit(1);
  }
}

start();
