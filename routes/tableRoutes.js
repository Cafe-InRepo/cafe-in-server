const express = require("express");

const verifyToken = require("../middleWares/jerifyToken");
const {
  getTablesWithUnpaiedOrders,
  createTable,
  getTableById,
} = require("../controllers/TableController");
const verifySuperClient = require("../middleWares/VerifySuperClient");
const router = express.Router();

// Define routes for User model
router.get("/", verifySuperClient, getTablesWithUnpaiedOrders);
router.get("/:id", verifySuperClient, getTableById);
router.post("/", verifySuperClient, createTable);

module.exports = router;
