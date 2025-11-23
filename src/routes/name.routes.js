const express = require("express");
const router = express.Router();
const nameController = require("../controllers/name.controller");

router.get("/get", nameController.getName);
router.post("/create", nameController.createName);
router.patch("/change", nameController.changeName);

module.exports = router;
