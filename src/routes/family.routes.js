const express = require("express");
const router = express.Router();
const familyController = require("../controllers/family.controller");

router.get("/get", familyController.getFamilies);
router.post("/create", familyController.createFamily);
router.post("/join", familyController.joinFamily);
router.delete("/delete/:familyId", familyController.deleteFamily);

module.exports = router;
