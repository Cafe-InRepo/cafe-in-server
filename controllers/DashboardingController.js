const mongoose = require("mongoose");
const Product = require("../models/Product");
const User = require("../models/User");

// Calculate total revenue, profit, sales volume, and monthly profits
const calculateRevenueAndProfit = (products) => {
  let totalRevenue = 0;
  let totalCost = 0;
  let salesVolume = 0;
  let totalMoneySpent = 0;
  const monthlyProfits = {};

  products.forEach((product) => {
    product.sales.forEach((sale) => {
      const saleMonth = new Date(sale.sellingDate).toISOString().slice(0, 7); // Get the month in YYYY-MM format
      totalRevenue += sale.sellingPrice * sale.quantitySold;
      totalCost += product.buyingPrice * sale.quantitySold;
      salesVolume += sale.quantitySold;

      // Calculate profit for the sale
      const saleProfit =
        (sale.sellingPrice - product.buyingPrice) * sale.quantitySold;

      // Add profit to the corresponding month
      if (!monthlyProfits[saleMonth]) {
        monthlyProfits[saleMonth] = 0;
      }
      monthlyProfits[saleMonth] += saleProfit;
    });

    totalMoneySpent +=
      product.buyingPrice *
      (product.numberInStock +
        product.sales.reduce((acc, sale) => acc + sale.quantitySold, 0));
  });

  const totalProfit = totalRevenue - totalCost;

  return {
    totalRevenue,
    totalProfit,
    salesVolume,
    totalMoneySpent,
    monthlyProfits,
  };
};

// Get best-selling products
const getBestSellingProducts = (products) => {
  return products.sort((a, b) => b.sales.length - a.sales.length).slice(0, 5);
};

// Get product-wise profit
const getProductWiseProfit = (products) => {
  return products.map((product) => {
    // Calculate the total profit for each product
    const totalProfit = product.sales.reduce((acc, sale) => {
      return (
        acc + (sale.sellingPrice - product.buyingPrice) * sale.quantitySold
      );
    }, 0);

    return {
      name: product.name,
      profit: totalProfit,
    };
  });
};

// Get inventory value
const getInventoryValue = (products) => {
  return products.reduce(
    (acc, product) => acc + product.buyingPrice * product.numberInStock,
    0
  );
};

// Dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("buyer")
      .populate({
        path: "sales",
        populate: {
          path: "seller",
          model: "User",
        },
      });

    if (!products || products.length === 0) {
      return res.status(404).json({ error: "No products found" });
    }

    const {
      totalRevenue,
      totalProfit,
      salesVolume,
      totalMoneySpent,
      monthlyProfits,
    } = calculateRevenueAndProfit(products);
    const bestSellingProducts = getBestSellingProducts(products);
    const productWiseProfit = getProductWiseProfit(products);
    const inventoryValue = getInventoryValue(products);
    const getProductAge = getProductAgeAndLabel(products);
    res.status(200).json({
      totalRevenue,
      totalProfit,
      salesVolume,
      bestSellingProducts,
      productWiseProfit,
      inventoryValue,
      totalMoneySpent,
      getProductAge,
      monthlyProfits, // Include monthly profits in the response
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
const getProductAgeAndLabel = (products) => {
  const currentDate = new Date();
  const productsWithAgeAndLabel = products.map((product) => {
    const ageInDays = Math.floor(
      (currentDate - new Date(product.buyingDate)) / (1000 * 60 * 60 * 24)
    );

    const isOldStock = ageInDays > 30;
    return {
      ...product.toObject(),
      ageInDays,
      isOldStock,
      label: isOldStock ? "In Stock for a while" : "New Stock",
    };
  });

  return productsWithAgeAndLabel;
};

module.exports = {
  getDashboardStats,
};
