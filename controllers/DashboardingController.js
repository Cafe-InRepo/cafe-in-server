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

    // Find orders with 'archived' status and within today's date, and filter by superClientId directly
    const revenue = await Order.find({
      status: "archived",
      timestamp: { $gte: startOfDay },
      superClientId, // Filter by superClientId directly
    }).then((orders) => {
      // Calculate total revenue by summing the totalPrice of all orders
      return orders.reduce((sum, order) => sum + order.totalPrice, 0);
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

//get revenues for current month
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

    // Find orders with 'archived' status and within the current month, filtered by superClientId
    const orders = await Order.find({
      status: "archived",
      timestamp: { $gte: startOfMonth },
      superClientId, // Directly filter by superClientId
    });

    // Calculate the daily revenue by summing the totalPrice for each day
    const revenue = orders.reduce((result, order) => {
      const day = order.timestamp.getDate();
      if (!result[day]) {
        result[day] = 0;
      }
      result[day] += order.totalPrice;
      return result;
    }, {});

    // Format the daily revenue for response
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

// growth current & previous month
const getMonthlyGrowthRate = async (req, res) => {
  const superClientId = req.superClientId;

  if (!superClientId) {
    return res.status(400).json({ message: "SuperClientId is required" });
  }

  if (!mongoose.Types.ObjectId.isValid(superClientId)) {
    return res.status(400).json({ message: "Invalid SuperClientId format" });
  }

  try {
    const currentDate = new Date();
    const startOfCurrentMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const startOfPreviousMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1
    );
    const endOfPreviousMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      0
    ); // Last day of the previous month

    // Fetch orders for the current month and filter by superClientId
    const currentMonthOrders = await Order.find({
      status: "archived",
      timestamp: { $gte: startOfCurrentMonth },
      superClientId, // Directly filter by superClientId
    });

    // Calculate current month revenue
    const currentMonthRevenue = currentMonthOrders.reduce(
      (total, order) => total + order.totalPrice,
      0
    );

    // Fetch orders for the previous month and filter by superClientId
    const previousMonthOrders = await Order.find({
      status: "archived",
      timestamp: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth },
      superClientId, // Directly filter by superClientId
    });

    // Calculate previous month revenue
    const previousMonthRevenue = previousMonthOrders.reduce(
      (total, order) => total + order.totalPrice,
      0
    );

    // Calculate growth rate
    let growthRate = 0;
    if (previousMonthRevenue > 0) {
      growthRate =
        ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) *
        100;
    } else if (currentMonthRevenue > 0) {
      growthRate = 100; // If there's no revenue in the previous month and some revenue in the current month, growth rate is 100%
    }

    res.status(200).json({
      currentMonthRevenue,
      previousMonthRevenue,
      growthRate: growthRate.toFixed(2), // Limiting to 2 decimal places
    });
  } catch (error) {
    console.error("Error retrieving monthly growth rate:", error);
    res.status(500).json({
      message: "Failed to retrieve monthly growth rate",
      error: error.message,
    });
  }
};

//get revenues for current week
const getWeeklyRevenue = async (req, res) => {
  const superClientId = req.superClientId;

  if (!superClientId) {
    return res.status(400).json({ message: "SuperClientId is required" });
  }

  if (!mongoose.Types.ObjectId.isValid(superClientId)) {
    return res.status(400).json({ message: "Invalid SuperClientId format" });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    // Calculate the start date for the current week (6 days before today)
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 6);

    // Set the end date to the end of today for the current week
    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    // Calculate the previous week's start and end date
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(startDate.getDate() - 7);

    const prevEndDate = new Date(startDate);
    prevEndDate.setHours(23, 59, 59, 999);

    // Fetch orders for current week and previous week, filtered by superClientId
    const [currentWeekOrders, prevWeekOrders] = await Promise.all([
      Order.find({
        status: "archived",
        timestamp: { $gte: startDate, $lte: endDate },
        superClientId, // Directly filter by superClientId
      }),
      Order.find({
        status: "archived",
        timestamp: { $gte: prevStartDate, $lte: prevEndDate },
        superClientId, // Directly filter by superClientId
      }),
    ]);

    // Calculate total revenue for current and previous week
    const currentWeekRevenue = currentWeekOrders.reduce(
      (total, order) => total + order.totalPrice,
      0
    );
    const prevWeekRevenue = prevWeekOrders.reduce(
      (total, order) => total + order.totalPrice,
      0
    );

    // Calculate growth rate between current and previous week
    const growthRate =
      prevWeekRevenue > 0
        ? ((currentWeekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100
        : 0;

    // Calculate daily revenue for each day in the current week
    const dailyRevenue = currentWeekOrders.reduce((result, order) => {
      const day = order.timestamp.getDate();
      if (!result[day]) {
        result[day] = 0;
      }
      result[day] += order.totalPrice;
      return result;
    }, {});

    // Format daily revenue data for response
    const formattedRevenue = Object.entries(dailyRevenue).map(
      ([day, total]) => ({
        _id: { day: parseInt(day) },
        dailyRevenue: total,
      })
    );

    res.status(200).json({
      currentWeekRevenue,
      prevWeekRevenue,
      growthRate,
      dailyRevenue: formattedRevenue,
    });
  } catch (error) {
    console.error("Error retrieving weekly revenue:", error);
    res.status(500).json({
      message: "Failed to retrieve weekly revenue",
      error: error.message,
    });
  }
};

//get revenue between 2 dates
const getRevenueBetweenDates = async (req, res) => {
  const { startDate, endDate } = req.body;
  const superClientId = req.superClientId;

  if (!superClientId) {
    return res.status(400).json({ message: "SuperClientId is required" });
  }

  if (!mongoose.Types.ObjectId.isValid(superClientId)) {
    return res.status(400).json({ message: "Invalid SuperClientId format" });
  }

  // If no startDate or endDate is provided, set them to today and 14 days before
  const currentDate = new Date();
  const defaultEndDate = new Date(currentDate); // End of today
  defaultEndDate.setHours(23, 59, 59, 999); // End of today
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 14); // 14 days before today
  defaultStartDate.setHours(0, 0, 0, 0); // Start of the day 14 days ago

  // Use the provided dates or fall back to the default range
  const start = startDate ? new Date(startDate) : defaultStartDate;
  const end = endDate ? new Date(endDate) : defaultEndDate;

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ message: "Invalid date format" });
  }

  try {
    // Fetch orders within the date range for the superClient
    const orders = await Order.find({
      status: "archived",
      timestamp: { $gte: start, $lte: end },
      superClientId, // Filter by superClientId directly in the query
    });

    // If no orders found, return an appropriate response
    if (orders.length === 0) {
      return res
        .status(404)
        .json({ message: "No revenue found for the given date range." });
    }

    // Calculate the revenue for each day
    const revenue = orders.reduce((result, order) => {
      const year = order.timestamp.getFullYear();
      const month = order.timestamp.getMonth() + 1; // Months are zero-indexed in JS, so add 1
      const day = order.timestamp.getDate();

      // Create a unique key for each year, month, and day combination
      const key = `${year}-${month}-${day}`;

      if (!result[key]) {
        result[key] = 0;
      }

      result[key] += order.totalPrice;
      return result;
    }, {});

    // Format the revenue data with year, month, and day
    const formattedRevenue = Object.entries(revenue).map(([key, total]) => {
      const [year, month, day] = key.split("-").map(Number);

      return {
        _id: { year, month, day },
        dailyRevenue: total,
      };
    });

    // Return the formatted revenue
    res.status(200).json(formattedRevenue);
  } catch (error) {
    console.error("Error retrieving revenue between dates:", error);
    res.status(500).json({
      message: "Failed to retrieve revenue between dates",
      error: error.message,
    });
  }
};

const getRevenueByClient = async (req, res) => {
  const superClientId = req.superClientId; // Assuming this comes from authentication

  try {
    // Find orders with 'archived' status and matching superClientId
    const orders = await Order.find({
      status: "archived",
      superClientId, // Directly filter by superClientId
    }).populate("user", "fullName"); // Populate 'user' field and select 'fullName'

    // Calculate revenue by client
    const revenue = orders.reduce((result, order) => {
      const clientId = order.user?._id;
      const clientName = order.user?.fullName;
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

const getUserArchivedOrders = async (req, res) => {
  const userId = req.userId; // Use the authenticated user's ID
  console.log(userId);

  try {
    // Find orders with 'archived' status, where isClosed is false and the user matches the current user
    const orders = await Order.find({
      status: "archived",
      isClosed: false,
      user: userId, // Ensure the user matches the authenticated user
    }).populate("user", "fullName"); // Populate 'user' to get fullName

    // Format product details directly from productDetails instead of populating
    const orderData = orders.map((order) => ({
      orderId: order._id,
      products: order.products.map((productEntry) => ({
        productId: productEntry.productDetails._id,
        productName: productEntry.productDetails.name,
        productPrice: productEntry.productDetails.price,
        quantity: productEntry.quantity,
        totalPrice: productEntry.quantity * productEntry.productDetails.price, // Calculate total for each product
      })),
      totalPrice: order.totalPrice, // The total price of the entire order
      tips: order.tips,
      timestamp: order.timestamp, // Timestamp when the order was placed
    }));

    // Calculate the overall total revenue for all orders combined
    const totalRevenue = orderData.reduce(
      (acc, order) => acc + order.totalPrice,
      0
    );

    // Format the response data
    const responseData = {
      orders: orderData, // Array of order details
      totalRevenue, // Overall total of all orders
    };

    // Send back the response with orders and total revenue
    res.status(200).json(responseData);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve archived orders",
      error: error.message,
    });
    console.log(error);
  }
};

const closeUserOrders = async (req, res) => {
  const userId = req.userId; // Get the current user's ID from the request

  try {
    // Find all orders that match the current user, are archived, and not yet closed
    const ordersToClose = await Order.find({
      user: userId, // Match the current user's orders
      isClosed: false, // Only find orders where isClosed is false
      status: "archived", // Ensure the orders are archived
    });

    // If no matching orders are found, return a 404 response
    if (ordersToClose.length === 0) {
      return res.status(404).json({
        message: "No open archived orders found for the current user.",
      });
    }

    // Transform the orders to include product details instead of populating
    const ordersWithProductDetails = ordersToClose.map((order) => {
      const productsWithDetails = order.products.map((product) => ({
        name: product.productDetails.name,
        quantity: product.quantity,
        price: product.productDetails.price,
        total: product.quantity * product.productDetails.price,
      }));
      return { ...order.toObject(), products: productsWithDetails };
    });

    // Perform the update to set isClosed to true
    await Order.updateMany(
      {
        _id: { $in: ordersToClose.map((order) => order._id) }, // Update only the found orders
      },
      {
        $set: { isClosed: true }, // Set isClosed to true
      }
    );

    // Return the modified orders with product details
    res.status(200).json({
      message: "All matching orders have been successfully closed.",
      closedOrders: ordersWithProductDetails, // Return the orders that were closed with product details
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to close orders",
      error: error.message,
    });
  }
};

const getRevenueByProduct = async (req, res) => {
  const superClientId = req.superClientId;

  try {
    // Fetch orders using 'status' and 'superClientId' directly in the query
    const orders = await Order.find({
      status: "archived",
      superClientId: superClientId, // Filter by superClientId directly
    });

    // Calculate revenue using the productDetails field directly
    const revenue = orders.reduce((result, order) => {
      order.products.forEach((productEntry) => {
        const { productDetails, quantity } = productEntry;

        // Ensure productDetails exists (in case products were deleted)
        if (productDetails) {
          const productId = productDetails._id;
          if (!result[productId]) {
            result[productId] = {
              productName: productDetails.name,
              totalRevenue: 0,
            };
          }
          result[productId].totalRevenue += quantity * productDetails.price;
        }
      });
      return result;
    }, {});

    // Format the revenue data for response
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

    // Find orders from the current year, without the unnecessary table population
    const orders = await Order.find({
      status: "archived",
      timestamp: {
        $gte: new Date(`${currentYear}-01-01T00:00:00Z`),
        $lt: new Date(`${currentYear + 1}-01-01T00:00:00Z`),
      },
      superClientId: superClientId, // Directly filter by superClientId
    });

    // Group revenue by product and month
    const revenue = orders.reduce((result, order) => {
      const month = new Date(order.timestamp).getMonth() + 1; // Get month from timestamp
      if (month > currentMonth) return result; // Skip future months

      order.products.forEach((productEntry) => {
        const { productDetails, quantity } = productEntry;

        // Ensure productDetails exists (in case products were deleted)
        if (productDetails) {
          const productId = productDetails._id;
          if (!result[month]) result[month] = {};
          if (!result[month][productId]) {
            result[month][productId] = {
              productName: productDetails.name,
              totalRevenue: 0,
            };
          }
          result[month][productId].totalRevenue +=
            quantity * productDetails.price;
        }
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
    // Find orders with 'archived' status and filter by superClientId directly
    const orders = await Order.find({
      status: "archived",
      superClientId: superClientId, // Filter by superClientId directly in the query
    });

    // Calculate the total quantity sold using the productDetails field directly
    const products = orders.reduce((result, order) => {
      order.products.forEach((productEntry) => {
        const { productDetails, quantity } = productEntry;

        // Ensure productDetails exists (in case products were deleted)
        if (productDetails) {
          const productId = productDetails._id;
          if (!result[productId]) {
            result[productId] = {
              productName: productDetails.name,
              totalSold: 0,
            };
          }
          result[productId].totalSold += quantity;
        }
      });
      return result;
    }, {});

    // Format the product data for response
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

    // Fetch orders with filtering by status and superClientId directly in the query
    const orders = await Order.find({
      status: "archived",
      superClientId: superClientId, // Directly filter by superClientId
      timestamp: { $gte: startOfYear, $lte: endOfYear },
    });

    // Group orders by month
    const ordersByMonth = orders.reduce((result, order) => {
      const month = order.timestamp.getMonth() + 1; // Get the month (1-12)
      if (!result[month]) {
        result[month] = [];
      }
      result[month].push(order);
      return result;
    }, {});

    // Format the orders by month for the response
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
  const superClientId = req.superClientId;
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({
      message: "Start date and end date are required",
    });
  }

  try {
    // Fetch orders between startDate and endDate for the specific superClientId
    const orders = await Order.find({
      status: "archived",
      superClientId: superClientId, // Filter by superClientId directly in the query
      timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) },
    });

    // Calculate revenue using the productDetails field directly
    const revenue = orders.reduce((result, order) => {
      order.products.forEach((productEntry) => {
        const { productDetails, quantity } = productEntry;

        // Ensure productDetails exists (in case products were deleted)
        if (productDetails) {
          const productId = productDetails._id;
          if (!result[productId]) {
            result[productId] = {
              productName: productDetails.name,
              totalRevenue: 0,
            };
          }
          result[productId].totalRevenue += quantity * productDetails.price;
        }
      });
      return result;
    }, {});

    // Format the revenue data for response
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

    // Query orders for the given month and year, filtering by superClientId
    const orders = await Order.find({
      status: "archived",
      superClientId: superClientId,
      timestamp: { $gte: startOfMonth, $lte: endOfMonth },
    });

    // Calculate the daily revenue for the selected month
    const revenue = orders.reduce((result, order) => {
      const day = order.timestamp.getDate();
      if (!result[day]) {
        result[day] = 0;
      }
      result[day] += order.totalPrice;
      return result;
    }, {});

    // Format the revenue data to send as response
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

    // Query all orders for the current year that match the superClientId and status
    const orders = await Order.find({
      status: "archived",
      superClientId: superClientId,
      timestamp: {
        $gte: new Date(currentYear, 0, 1), // Start of the year
        $lte: new Date(currentYear, 11, 31, 23, 59, 59), // End of the year
      },
    });

    // Initialize an array to store revenue for each month
    const monthlyRevenue = Array(12).fill(0);

    // Process orders and accumulate revenue by month
    orders.forEach((order) => {
      const month = order.timestamp.getMonth(); // Get the month of the order
      monthlyRevenue[month] += order.totalPrice; // Add the order's total price to the appropriate month
    });

    // Format the response to include only up to the current month
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
        order.superClientId.equals(superClientId)
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

    // Get the start of the week (Sunday)
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0); // Set time to midnight

    // Get the end of the week (Saturday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999); // Set time to the end of the day

    // Query for orders within the week for the given superClientId
    const orders = await Order.find({
      status: "archived",
      timestamp: { $gte: startOfWeek, $lte: endOfWeek },
      superClientId: superClientId, // Filter by superClientId directly
    });

    // Initialize an object to store revenue data per day and product
    const dailyProductRevenue = {};

    // Loop through the orders to populate dailyProductRevenue
    orders.forEach((order) => {
      const day = new Date(order.timestamp).toISOString().split("T")[0]; // Format date as YYYY-MM-DD
      if (!dailyProductRevenue[day]) {
        dailyProductRevenue[day] = {}; // Initialize the day's product revenue object
      }

      // Loop through the products and calculate their revenue
      order.products.forEach((product) => {
        const { productDetails, quantity } = product;
        if (productDetails) {
          const productId = productDetails._id;
          if (!dailyProductRevenue[day][productId]) {
            dailyProductRevenue[day][productId] = {
              productName: productDetails.name,
              totalRevenue: 0,
            };
          }
          // Calculate the revenue for each product
          dailyProductRevenue[day][productId].totalRevenue +=
            quantity * productDetails.price;
        }
      });
    });

    // Format the response to return data for each day of the week
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

const getAverageProcessingTime = async (req, res) => {
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({
      message: "Start date and end date are required",
    });
  }

  try {
    // Query orders based on timestamp (within the date range)
    const orders = await Order.find({
      timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: { $in: ["pending", "preparing", "completed"] },
    });

    let pendingToPreparingDurations = [];
    let preparingToCompletedDurations = [];

    // Calculate durations for each order
    orders.forEach((order) => {
      const statusDurations = order.getStatusDurations(); // Assuming getStatusDurations gives the correct durations

      // Calculate duration from pending to preparing
      if (statusDurations.pending && statusDurations.preparing) {
        pendingToPreparingDurations.push(statusDurations.preparing);
      }

      // Calculate duration from preparing to completed
      if (statusDurations.preparing && statusDurations.completed) {
        preparingToCompletedDurations.push(statusDurations.completed);
      }
    });

    // Helper function to calculate the average time (in minutes)
    const calculateAverageTime = (durations) => {
      if (durations.length === 0) return 0;
      const totalDuration = durations.reduce(
        (sum, duration) => sum + duration,
        0
      );
      return Math.round(totalDuration / durations.length / 60000); // Convert milliseconds to minutes
    };

    // Calculate average times for both transitions
    const avgPendingToPreparing = calculateAverageTime(
      pendingToPreparingDurations
    );
    const avgPreparingToCompleted = calculateAverageTime(
      preparingToCompletedDurations
    );

    res.status(200).json({
      avgPendingToPreparing,
      avgPreparingToCompleted,
    });
  } catch (error) {
    console.error("Error calculating average processing time:", error);
    res
      .status(500)
      .json({ message: "Failed to calculate average processing time", error });
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
  getUserArchivedOrders,
  closeUserOrders,
  getWeeklyRevenue,
  getRevenueBetweenDates,
  getMonthlyGrowthRate,
  getAverageProcessingTime,
};
