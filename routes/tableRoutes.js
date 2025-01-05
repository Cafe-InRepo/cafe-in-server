const express = require("express");
const verifyToken = require("../middleWares/jerifyToken");
const verifyClientOrSuperClient = require("../middleWares/verifyClientOrSuperClient");

const {
  getTablesWithUnpaiedOrders,
  createTable,
  getTableById,
  deleteTable,
  getTables,
  updateTable,
  createReservation,
  getReservationsForTable,
  checkTableAvailability,
  deleteReservation,
  updateReservation,
  getTablesWithReservations,
} = require("../controllers/TableController");

const router = express.Router();

// Routes for table operations
router.get("/", verifyClientOrSuperClient, getTablesWithUnpaiedOrders); // Get tables with unpaid orders
router.get("/all", verifyToken, getTables); // Get all tables for the authenticated user
router.get("/:id", verifyClientOrSuperClient, getTableById); // Get a single table by ID
router.post("/", verifyClientOrSuperClient, createTable); // Create a new table
router.put("/:id", verifyClientOrSuperClient, updateTable); // Update an existing table
router.delete("/:id", verifyClientOrSuperClient, deleteTable); // Delete a table

// Routes for reservation operations
router.post("/reservations", verifyClientOrSuperClient, createReservation); // Create a new reservation
router.get(
  "/:tableId/reservations",
  verifyClientOrSuperClient,
  getReservationsForTable
); // Get reservations for a specific table
router.post(
  "/reservations/all",
  verifyClientOrSuperClient,
  getTablesWithReservations
); // Get reservations
router.post("/availability", verifyClientOrSuperClient, checkTableAvailability); // Check table availability for a time range
router.delete(
  "/:tableId/reservations/:reservationId",
  verifyClientOrSuperClient,
  deleteReservation
); // Delete a specific reservation
router.put(
  "/:tableId/reservations/:reservationId",
  verifyClientOrSuperClient,
  updateReservation
); // Update an existing reservation

module.exports = router;
