const express = require("express");

const verifyToken = require("../middleWares/jerifyToken");
const {
  getTablesWithUnpaiedOrders,
  createTable,
  getTableById,
  deleteTable,
} = require("../controllers/TableController");
const verifyClientOrSuperClient = require("../middleWares/verifyClientOrSuperClient");
const router = express.Router();

// Define routes for User model
router.get("/", verifyClientOrSuperClient, getTablesWithUnpaiedOrders);
router.get("/:id", verifyClientOrSuperClient, getTableById);
router.post("/", verifyClientOrSuperClient, createTable);
router.delete("/:id", verifyClientOrSuperClient, deleteTable);

module.exports = router;
