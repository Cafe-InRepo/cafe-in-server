const express = require("express");

const {
  createOrder,
  getOrder,
  getAllOrders,
  updateOrder,
  rateOrderProducts,
  deleteOrder,
  confirmSelectedPayments,
  confirmAllPayments,
} = require("../controllers/OrderController");
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
router.put("/confirm/confirm-payment", confirmSelectedPayments);
router.put("/tables/:tableId/confirm-all-payments", confirmAllPayments);

module.exports = router;
