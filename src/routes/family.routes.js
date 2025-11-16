const express = require("express");
const router = express.Router();
const familyController = require("../controllers/family.controller");

router.post("/create", familyController.createFamily);
router.post("/join", familyController.joinFamily);
router.get("/", familyController.getFamilies);
router.delete("/:familyId", familyController.deleteFamily);

module.exports = router;
