const cors = require("cors");
const express = require("express");
const familyRoutes = require("./routes/family.routes");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/api/family", familyRoutes);

app.get("/", (req, res) => {
  res.json({ message: "The API is running!" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "500. Internal server error" });
});

module.exports = app;
