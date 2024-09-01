const express = require("express");
const {
  getDailyRevenue,
  getMonthlyRevenue,
  getRevenueByClient,
  getRevenueByProduct,
  getMostSoldProducts,
  getOrdersByMonthForYear,
  getRevenueForCurrentYear,
  getRevenueCSV,
  getRevenueByProductByMonth,
} = require("../controllers/DashboardingController");
const verifySuperClient = require("../middleWares/VerifySuperClient");

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
router.get("/revenue-csv", verifySuperClient, getRevenueCSV);

module.exports = router;
