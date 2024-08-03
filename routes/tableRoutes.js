const express = require("express");

const verifyToken = require("../middleWares/jerifyToken");
const {
  getTablesWithUnpaiedOrders,
} = require("../controllers/TableController");
const verifySuperClient = require("../middleWares/VerifySuperClient");
const router = express.Router();

// Define routes for User model
router.get("/", verifySuperClient, getTablesWithUnpaiedOrders);

module.exports = router;
