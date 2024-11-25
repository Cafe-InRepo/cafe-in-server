const express = require("express");
const verifySuperClient = require("../middleWares/VerifySuperClient");
const {
  createSection,
  getSections,
  getSectionById,
  updateSection,
  deleteSection,
} = require("../controllers/SectionController");
const router = express.Router();

router.post("/", verifySuperClient, createSection);
router.get("/", getSections);
router.get("/:sectionId", getSectionById);
router.put("/:sectionId", updateSection);
router.delete("/:sectionId", deleteSection);

module.exports = router;
