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
  getOrdersBySuperClientIdFIFO,
  updateOrderStatus,
} = require("../controllers/OrderController");
const decodeTableToken = require("../middleWares/decodeTableToken");
const verifySuperClient = require("../middleWares/VerifySuperClient");
const router = express.Router();

// Define routes for User model
router.post("/", decodeTableToken, createOrder);
router.post("/:orderId/rate", rateOrderProducts);
router.put("/:orderId", updateOrder);
router.put("/update-status/:orderId", verifySuperClient, updateOrderStatus);

router.delete("/:orderId", deleteOrder);

router.get("/:orderId", getOrder);
router.get("/", decodeTableToken, getAllOrders);
router.get("/client", getAllOrders);
router.get(
  "/orders/ordersfifo",
  verifySuperClient,
  getOrdersBySuperClientIdFIFO
);

// router.put("/:orderId/increase/:productId", increaseProductQuantity);
// router.put("/:orderId/decrease/:productId", decreaseProductQuantity);
router.put("/confirm/confirm-payment", confirmSelectedPayments);
router.put("/tables/:tableId/confirm-all-payments", confirmAllPayments);

module.exports = router;
