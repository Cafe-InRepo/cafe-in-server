const mongoose = require("mongoose");
const Order = require("../models/Order");
const xlsx = require("xlsx");
const getDailyRevenue = async (req, res) => {
  const superClientId = req.superClientId;

  if (!superClientId) {
    return res.status(400).json({
      message: "SuperClientId is required",
    });
  }

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    if (!mongoose.Types.ObjectId.isValid(superClientId)) {
      return res.status(400).json({
        message: "Invalid SuperClientId format",
      });
    }

    const revenue = await Order.find({
      status: "archived",
      timestamp: { $gte: startOfDay },
    })
      .populate("table") // Populate the table
      .then((orders) => {
        return orders.filter((order) =>
          order.table.superClient.equals(superClientId)
        );
      })
      .then((filteredOrders) => {
        return filteredOrders.reduce((sum, order) => sum + order.totalPrice, 0);
      });

    res.status(200).json({ totalRevenue: revenue || 0 });
  } catch (error) {
    console.error("Error retrieving daily revenue:", error);

    res.status(500).json({
      message: "Failed to retrieve daily revenue",
      error: error.message,
    });
  }
};

const getMonthlyRevenue = async (req, res) => {
  const superClientId = req.superClientId;

  if (!superClientId) {
    return res.status(400).json({ message: "SuperClientId is required" });
  }

  if (!mongoose.Types.ObjectId.isValid(superClientId)) {
    return res.status(400).json({ message: "Invalid SuperClientId format" });
  }

  try {
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    const orders = await Order.find({
      status: "archived",
      timestamp: { $gte: startOfMonth },
    }).populate("table");

    const filteredOrders = orders.filter((order) =>
      order.table.superClient.equals(superClientId)
    );

    const revenue = filteredOrders.reduce((result, order) => {
      const day = order.timestamp.getDate();
      if (!result[day]) {
        result[day] = 0;
      }
      result[day] += order.totalPrice;
      return result;
    }, {});

    const formattedRevenue = Object.entries(revenue).map(([day, total]) => ({
      _id: { day: parseInt(day) },
      dailyRevenue: total,
    }));

    res.status(200).json(formattedRevenue);
  } catch (error) {
    console.error("Error retrieving monthly revenue:", error);
    res.status(500).json({
      message: "Failed to retrieve monthly revenue",
      error: error.message,
    });
  }
};

const getRevenueByClient = async (req, res) => {
  const superClientId = req.superClientId; // Assuming you get this from authentication

  try {
    // Find orders with 'archived' status and populate 'table' and 'user' (for client details)
    const orders = await Order.find({
      status: "archived",
    })
      .populate({
        path: "table", // Populate the 'table' field
        populate: {
          path: "superClient", // Populate the 'superClient' within the table
          model: "User", // SuperClient refers to the 'User' model
        },
      })
      .populate("user", "fullName") // Populate 'user' field and select 'fullName'
      .then((orders) => {
        // Filter orders by superClient, making sure it's populated
        return orders.filter(
          (order) =>
            order.table.superClient &&
            order.table.superClient._id.equals(superClientId)
        );
      });

    // Calculate revenue by client
    const revenue = orders.reduce((result, order) => {
      const clientId = order.user;
      const clientName = order.user.fullName;
      const orderDate = new Date(order.timestamp);
      const year = orderDate.getFullYear();
      const month = orderDate.getMonth(); // Get month as 0-11 (0 = January, 11 = December)
      const yearMonthKey = `${year}-${month + 1}`; // Format as "YYYY-MM" (add 1 to month to make it 1-12)

      // Initialize if not already set
      if (!result[clientId]) {
        result[clientId] = {
          name: clientName, // Store the client name
          revenueByMonth: {},
        };
      }
      if (!result[clientId].revenueByMonth[yearMonthKey]) {
        result[clientId].revenueByMonth[yearMonthKey] = 0;
      }

      // Add the order's totalPrice to the appropriate client and month
      result[clientId].revenueByMonth[yearMonthKey] += order.totalPrice;
      return result;
    }, {});

    // Format the revenue data for response
    const formattedRevenue = Object.entries(revenue).map(
      ([clientId, { name, revenueByMonth }]) => {
        const monthlyData = Object.entries(revenueByMonth).map(
          ([yearMonth, total]) => ({
            month: yearMonth,
            totalRevenue: total,
          })
        );

        return {
          clientId,
          clientName: name, // Include client name
          monthlyRevenue: monthlyData,
        };
      }
    );

    res.status(200).json(formattedRevenue);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve revenue by client per month",
      error: error.message,
    });
  }
};

const getRevenueByProduct = async (req, res) => {
  const superClientId = req.superClientId;

  try {
    const orders = await Order.find({
      status: "archived",
    })
      .populate("table") // Populate the table
      .populate("products.product") // Populate the products
      .then((orders) => {
        return orders.filter((order) =>
          order.table.superClient.equals(superClientId)
        );
      });

    const revenue = orders.reduce((result, order) => {
      order.products.forEach((product) => {
        const productId = product.product._id.toString();
        if (!result[productId]) {
          result[productId] = {
            productName: product.product.name,
            totalRevenue: 0,
          };
        }
        result[productId].totalRevenue +=
          product.quantity * product.product.price;
      });
      return result;
    }, {});

    const formattedRevenue = Object.entries(revenue).map(
      ([productId, details]) => ({
        _id: productId,
        productName: details.productName,
        totalRevenue: details.totalRevenue,
      })
    );

    res.status(200).json(formattedRevenue);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve revenue by product",
      error: error.message,
    });
  }
};
const getRevenueByProductByMonth = async (req, res) => {
  const superClientId = req.superClientId;

  try {
    // Get the current year and date
    const currentYear = new Date().getFullYear();
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-based

    // Find orders from the current year
    const orders = await Order.find({
      status: "archived",
      timestamp: {
        $gte: new Date(`${currentYear}-01-01T00:00:00Z`),
        $lt: new Date(`${currentYear + 1}-01-01T00:00:00Z`),
      },
    })
      .populate("table") // Populate the table
      .populate("products.product") // Populate the products
      .then((orders) => {
        return orders.filter((order) =>
          order.table.superClient.equals(superClientId)
        );
      });

    // Group revenue by product and month
    const revenue = orders.reduce((result, order) => {
      const month = new Date(order.timestamp).getMonth() + 1; // Get month from timestamp
      if (month > currentMonth) return result; // Skip future months

      order.products.forEach((product) => {
        const productId = product.product._id.toString();
        if (!result[month]) result[month] = {};
        if (!result[month][productId]) {
          result[month][productId] = {
            productName: product.product.name,
            totalRevenue: 0,
          };
        }
        result[month][productId].totalRevenue +=
          product.quantity * product.product.price;
      });
      return result;
    }, {});

    // Format the revenue data for response
    const formattedRevenue = Object.entries(revenue).map(
      ([month, products]) => ({
        month: parseInt(month, 10),
        products: Object.entries(products).map(([productId, details]) => ({
          _id: productId,
          productName: details.productName,
          totalRevenue: details.totalRevenue,
        })),
      })
    );

    res.status(200).json(formattedRevenue);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve revenue by product by month",
      error: error.message,
    });
  }
};

const getMostSoldProducts = async (req, res) => {
  const superClientId = req.superClientId;

  try {
    const orders = await Order.find({
      status: "archived",
    })
      .populate("table") // Populate the table
      .populate("products.product") // Populate the products
      .then((orders) => {
        return orders.filter((order) =>
          order.table.superClient.equals(superClientId)
        );
      });

    const products = orders.reduce((result, order) => {
      order.products.forEach((product) => {
        const productId = product.product._id.toString();
        if (!result[productId]) {
          result[productId] = {
            productName: product.product.name,
            totalSold: 0,
          };
        }
        result[productId].totalSold += product.quantity;
      });
      return result;
    }, {});

    const formattedProducts = Object.entries(products)
      .map(([productId, details]) => ({
        _id: productId,
        productName: details.productName,
        totalSold: details.totalSold,
      }))
      .sort((a, b) => b.totalSold - a.totalSold); // Sort by total sold

    const top10Products = formattedProducts.slice(0, 10); // Get the top 10

    res.status(200).json(top10Products);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve most sold products",
      error: error.message,
    });
  }
};

const getOrdersByMonthForYear = async (req, res) => {
  const superClientId = req.superClientId;

  if (!superClientId) {
    return res.status(400).json({ message: "SuperClientId is required" });
  }

  if (!mongoose.Types.ObjectId.isValid(superClientId)) {
    return res.status(400).json({ message: "Invalid SuperClientId format" });
  }

  try {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const endOfYear = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);

    const orders = await Order.find({
      status: "archived",
      timestamp: { $gte: startOfYear, $lte: endOfYear },
    })
      .populate("table") // Populate the table
      .then((orders) => {
        return orders.filter((order) =>
          order.table.superClient.equals(superClientId)
        );
      });

    const ordersByMonth = orders.reduce((result, order) => {
      const month = order.timestamp.getMonth() + 1;
      if (!result[month]) {
        result[month] = [];
      }
      result[month].push(order);
      return result;
    }, {});

    const formattedOrders = Object.entries(ordersByMonth).map(
      ([month, orders]) => ({
        _id: { month: parseInt(month) },
        orders: orders,
      })
    );

    res.status(200).json(formattedOrders);
  } catch (error) {
    console.error("Error retrieving orders by month:", error);
    res.status(500).json({
      message: "Failed to retrieve orders by month",
      error: error.message,
    });
  }
};
const getRevenueByProductBetweenDates = async (req, res) => {
  const { superClientId } = req;
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({
      message: "Start date and end date are required",
    });
  }

  try {
    const orders = await Order.find({
      status: "archived",
      timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) },
    })
      .populate("table") // Populate the table
      .populate("products.product") // Populate the products
      .then((orders) => {
        return orders.filter((order) =>
          order.table.superClient.equals(superClientId)
        );
      });

    const revenue = orders.reduce((result, order) => {
      order.products.forEach((product) => {
        const productId = product.product._id.toString();
        if (!result[productId]) {
          result[productId] = {
            productName: product.product.name,
            totalRevenue: 0,
          };
        }
        result[productId].totalRevenue +=
          product.quantity * product.product.price;
      });
      return result;
    }, {});

    const formattedRevenue = Object.entries(revenue).map(
      ([productId, details]) => ({
        _id: productId,
        productName: details.productName,
        totalRevenue: details.totalRevenue,
      })
    );

    res.status(200).json(formattedRevenue);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve revenue by product",
      error: error.message,
    });
  }
};
const getMonthlyRevenueForSpecificMonth = async (req, res) => {
  const { superClientId } = req;
  const { month, year } = req.body;

  if (!superClientId) {
    return res.status(400).json({ message: "SuperClientId is required" });
  }

  if (!mongoose.Types.ObjectId.isValid(superClientId)) {
    return res.status(400).json({ message: "Invalid SuperClientId format" });
  }

  if (month == null || year == null) {
    return res.status(400).json({ message: "Month and year are required" });
  }

  if (month < 1 || month > 12) {
    return res
      .status(400)
      .json({ message: "Invalid month value. It should be between 1 and 12." });
  }

  try {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999); // last day of the month

    const orders = await Order.find({
      status: "archived",
      timestamp: { $gte: startOfMonth, $lte: endOfMonth },
    }).populate("table");

    const filteredOrders = orders.filter((order) =>
      order.table.superClient.equals(superClientId)
    );

    const revenue = filteredOrders.reduce((result, order) => {
      const day = order.timestamp.getDate();
      if (!result[day]) {
        result[day] = 0;
      }
      result[day] += order.totalPrice;
      return result;
    }, {});

    const formattedRevenue = Object.entries(revenue).map(([day, total]) => ({
      _id: { day: parseInt(day) },
      dailyRevenue: total,
    }));

    res.status(200).json(formattedRevenue);
  } catch (error) {
    console.error("Error retrieving monthly revenue:", error);
    res.status(500).json({
      message: "Failed to retrieve monthly revenue",
      error: error.message,
    });
  }
};
const getRevenueForCurrentYear = async (req, res) => {
  const superClientId = req.superClientId;

  if (!superClientId) {
    return res.status(400).json({ message: "SuperClientId is required" });
  }

  if (!mongoose.Types.ObjectId.isValid(superClientId)) {
    return res.status(400).json({ message: "Invalid SuperClientId format" });
  }

  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const monthlyRevenue = Array(12).fill(0); // Initialize revenue for all 12 months to 0

    // Loop over each month up to the current month
    for (let month = 0; month <= currentMonth; month++) {
      const startOfMonth = new Date(currentYear, month, 1);
      const endOfMonth = new Date(currentYear, month + 1, 0, 23, 59, 59, 999); // Last day of the month

      const orders = await Order.find({
        status: "archived",
        timestamp: { $gte: startOfMonth, $lte: endOfMonth },
      }).populate("table");

      const filteredOrders = orders.filter((order) =>
        order.table.superClient.equals(superClientId)
      );

      const totalRevenueForMonth = filteredOrders.reduce((total, order) => {
        return total + order.totalPrice;
      }, 0);

      monthlyRevenue[month] = totalRevenueForMonth;
    }

    // Format the response to include only past and current months
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const formattedRevenue = months
      .slice(0, currentMonth + 1) // Only include up to the current month
      .map((monthName, index) => ({
        month: monthName,
        revenue: monthlyRevenue[index],
      }));

    res.status(200).json(formattedRevenue);
  } catch (error) {
    console.error("Error retrieving yearly revenue:", error);
    res.status(500).json({
      message: "Failed to retrieve yearly revenue",
      error: error.message,
    });
  }
};

const getRevenueExcel = async (req, res) => {
  const superClientId = req.superClientId;

  if (!superClientId) {
    return res.status(400).json({ message: "SuperClientId is required" });
  }

  if (!mongoose.Types.ObjectId.isValid(superClientId)) {
    return res.status(400).json({ message: "Invalid SuperClientId format" });
  }

  try {
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = Array(12).fill(0);

    for (let month = 0; month < 12; month++) {
      const startOfMonth = new Date(currentYear, month, 1);
      const endOfMonth = new Date(currentYear, month + 1, 0, 23, 59, 59, 999);

      const orders = await Order.find({
        status: "archived",
        timestamp: { $gte: startOfMonth, $lte: endOfMonth },
      }).populate("table");

      const filteredOrders = orders.filter((order) =>
        order.table.superClient.equals(superClientId)
      );

      const totalRevenueForMonth = filteredOrders.reduce((total, order) => {
        return total + order.totalPrice;
      }, 0);

      monthlyRevenue[month] = totalRevenueForMonth;
    }

    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const formattedRevenue = months.map((monthName, index) => ({
      Month: monthName,
      Revenue: monthlyRevenue[index],
    }));

    // Create a new workbook and add a worksheet
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(formattedRevenue);
    xlsx.utils.book_append_sheet(workbook, worksheet, "Revenue");

    // Set the headers for downloading the file
    res.setHeader("Content-Disposition", 'attachment; filename="revenue.xlsx"');
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    // Write the Excel file to the response
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.send(buffer);
  } catch (error) {
    console.error("Error retrieving yearly revenue:", error);
    res.status(500).json({
      message: "Failed to retrieve yearly revenue",
      error: error.message,
    });
  }
};
const getRevenueByProductForCurrentWeek = async (req, res) => {
  const superClientId = req.superClientId;

  try {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Get the start of the week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0); // Set time to midnight

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Get the end of the week (Saturday)
    endOfWeek.setHours(23, 59, 59, 999); // Set time to the end of the day

    const orders = await Order.find({
      status: "archived",
      timestamp: {
        $gte: startOfWeek,
        $lte: endOfWeek,
      },
    })
      .populate("table")
      .populate("products.product")
      .then((orders) =>
        orders.filter((order) => order.table.superClient.equals(superClientId))
      );

    const dailyProductRevenue = {};

    for (let i = 0; i <= 6; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      dailyProductRevenue[day.toISOString().split("T")[0]] = {};
    }

    orders.forEach((order) => {
      const day = new Date(order.timestamp).toISOString().split("T")[0];
      if (dailyProductRevenue[day]) {
        order.products.forEach((product) => {
          const productId = product.product._id.toString();
          if (!dailyProductRevenue[day][productId]) {
            dailyProductRevenue[day][productId] = {
              productName: product.product.name,
              totalRevenue: 0,
            };
          }
          dailyProductRevenue[day][productId].totalRevenue +=
            product.quantity * product.product.price;
        });
      }
    });

    const formattedRevenue = Object.entries(dailyProductRevenue).map(
      ([date, products]) => ({
        date,
        products: Object.entries(products).map(([productId, details]) => ({
          _id: productId,
          productName: details.productName,
          totalRevenue: details.totalRevenue,
        })),
      })
    );

    res.status(200).json(formattedRevenue);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve weekly product revenue",
      error: error.message,
    });
  }
};

module.exports = {
  getDailyRevenue,
  getMonthlyRevenue,
  getRevenueByClient,
  getRevenueByProduct,
  getMostSoldProducts,
  getOrdersByMonthForYear,
  getRevenueByProductBetweenDates,
  getMonthlyRevenueForSpecificMonth,
  getRevenueForCurrentYear,
  getRevenueExcel,
  getRevenueByProductByMonth,
  getRevenueByProductForCurrentWeek,
};
