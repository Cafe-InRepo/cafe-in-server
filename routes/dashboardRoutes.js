const express = require("express");
const verifyToken = require("../middleWares/jerifyToken");
const { getDashboardStats } = require("../controllers/DashboardingController");

const router = express.Router();
router.get("/", verifyToken, getDashboardStats);

module.exports = router;
