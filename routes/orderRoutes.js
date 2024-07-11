const express = require("express");

const {
  createOrder,
  getOrder,
  getAllOrders,
} = require("../controllers/OrderController");
const verifyToken = require("../middleWares/jerifyToken");
const router = express.Router();

// Define routes for User model
router.post("/", createOrder);
router.get("/:orderId", getOrder);
router.get("/", getAllOrders);

module.exports = router;
