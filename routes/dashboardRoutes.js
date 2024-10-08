const express = require("express");
const {
  getDailyRevenue,
  getMonthlyRevenue,
  getRevenueByClient,
  getRevenueByProduct,
  getMostSoldProducts,
  getOrdersByMonthForYear,
  getRevenueForCurrentYear,
  getRevenueByProductByMonth,
  getRevenueByProductForCurrentWeek,
  getRevenueExcel,
  getRevenueByProductBetweenDates,
  getUserArchivedOrders,
  closeUserOrders,
} = require("../controllers/DashboardingController");
const verifySuperClient = require("../middleWares/VerifySuperClient");
const verifyClientOrSuperClient = require("../middleWares/verifyClientOrSuperClient");
const verifyToken = require("../middleWares/jerifyToken");

const router = express.Router();

// Route to get daily revenue
router.get("/daily-revenue", verifySuperClient, getDailyRevenue);

router.get("/year-per-month", verifySuperClient, getOrdersByMonthForYear);

// Route to get monthly revenue
router.get("/monthly-revenue", verifySuperClient, getMonthlyRevenue);

// Route to get revenue by client
router.get("/revenue-by-client", verifySuperClient, getRevenueByClient);

// Route to get revenue by product
router.get("/revenue-by-product", verifySuperClient, getRevenueByProduct);
router.get(
  "/revenue-by-product-by-month",
  verifySuperClient,
  getRevenueByProductByMonth
);

// Route to get the most sold products
router.get("/most-sold-products", verifySuperClient, getMostSoldProducts);

router.get("/revenue-year", verifySuperClient, getRevenueForCurrentYear);
router.get("/revenue-csv", verifySuperClient, getRevenueExcel);
router.get("/daily-receipt", verifyToken, getUserArchivedOrders);
router.post("/close-daily", verifyToken, closeUserOrders);

router.get(
  "/revenue-by-product-by-day",
  verifySuperClient,
  getRevenueByProductForCurrentWeek
);
router.post(
  "/revenue-by-product-between-dates",
  verifySuperClient,
  getRevenueByProductBetweenDates
);

module.exports = router;
