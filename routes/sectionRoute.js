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
router.get("/", verifySuperClient, getSections);
router.get("/:sectionId", verifySuperClient, getSectionById);
router.put("/:sectionId", verifySuperClient, updateSection);
router.delete("/:sectionId", verifySuperClient, deleteSection);

module.exports = router;
