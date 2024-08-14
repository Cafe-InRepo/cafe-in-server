const express = require("express");

const verifyToken = require("../middleWares/jerifyToken");
const {
  getTablesWithUnpaiedOrders,
  createTable,
  getTableById,
} = require("../controllers/TableController");
const verifyClientOrSuperClient = require("../middleWares/verifyClientOrSuperClient");
const router = express.Router();

// Define routes for User model
router.get("/", verifyClientOrSuperClient, getTablesWithUnpaiedOrders);
router.get("/:id", verifyClientOrSuperClient, getTableById);
router.post("/", verifyClientOrSuperClient, createTable);

module.exports = router;
