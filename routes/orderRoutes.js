const express = require("express");

const {
  createOrder,
  getOrder,
  getAllOrders,
  updateOrder,
  increaseProductQuantity,
  decreaseProductQuantity,
} = require("../controllers/OrderController");
const verifyToken = require("../middleWares/jerifyToken");
const router = express.Router();

// Define routes for User model
router.post("/", createOrder);
router.put("/:orderId", updateOrder);

router.get("/:orderId", getOrder);
router.get("/", getAllOrders);
router.put('/:orderId/increase/:productId', increaseProductQuantity);
router.put('/:orderId/decrease/:productId', decreaseProductQuantity);

module.exports = router;
