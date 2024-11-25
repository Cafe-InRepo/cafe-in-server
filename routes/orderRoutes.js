const express = require("express");

const {
  createOrder,
  getOrder,
  getAllOrders,
  updateOrder,
  rateOrderProducts,
  deleteOrder,
  confirmSelectedPayments,
  getOrdersBySuperClientIdFIFO,
  updateOrderStatus,
  confirmSelectedProductsPayments,
} = require("../controllers/OrderController");
const decodeTableToken = require("../middleWares/decodeTableToken");
//const verifySuperClient = require("../middleWares/VerifySuperClient");
const verifyClientOrSuperClient = require("../middleWares/verifyClientOrSuperClient");
const verifyToken = require("../middleWares/jerifyToken");
const router = express.Router();

// Define routes for User model
router.post("/", decodeTableToken, createOrder);
router.post("/manual", verifyClientOrSuperClient, createOrder);

router.post("/:orderId/rate", rateOrderProducts);
router.put("/:orderId", updateOrder);
router.patch(
  "/update-status/:orderId",
  verifyClientOrSuperClient,
  updateOrderStatus
);

router.delete("/:orderId", deleteOrder);

router.get("/:orderId", getOrder);
router.get("/", decodeTableToken, getAllOrders);
//router.get("/client", getAllOrders);
router.get(
  "/orders/ordersfifo",
  verifyClientOrSuperClient,
  getOrdersBySuperClientIdFIFO
);

// router.put("/:orderId/increase/:productId", increaseProductQuantity);
// router.put("/:orderId/decrease/:productId", decreaseProductQuantity);
router.put("/confirm/confirm-payment", verifyToken, confirmSelectedPayments);
router.put(
  "/confirm/confirm-products-payment",
  verifyToken,
  confirmSelectedProductsPayments
);

module.exports = router;
