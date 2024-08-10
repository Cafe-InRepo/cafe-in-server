const express = require("express");

const {
  createOrder,
  getOrder,
  getAllOrders,
  updateOrder,
  increaseProductQuantity,
  decreaseProductQuantity,
  rateOrderProducts,
  deleteOrder,
} = require("../controllers/OrderController");
const verifyToken = require("../middleWares/jerifyToken");
const decodeTableToken = require("../middleWares/decodeTableToken");
const router = express.Router();

// Define routes for User model
router.post("/", decodeTableToken, createOrder);
router.post("/:orderId/rate", rateOrderProducts);
router.put("/:orderId", updateOrder);
router.delete("/:orderId", deleteOrder);

router.get("/:orderId", getOrder);
router.get("/", decodeTableToken, getAllOrders);
// router.put("/:orderId/increase/:productId", increaseProductQuantity);
// router.put("/:orderId/decrease/:productId", decreaseProductQuantity);

module.exports = router;
