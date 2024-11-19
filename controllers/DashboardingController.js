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

    // Fetch orders for the current month
    const currentMonthOrders = await Order.find({
      status: "archived",
      timestamp: { $gte: startOfCurrentMonth },
    }).populate("table");

    // Filter by superClientId for the current month
    const currentMonthFilteredOrders = currentMonthOrders.filter((order) =>
      order.table.superClient.equals(superClientId)
    );

    // Calculate current month revenue
    const currentMonthRevenue = currentMonthFilteredOrders.reduce(
      (total, order) => total + order.totalPrice,
      0
    );

    // Fetch orders for the previous month
    const previousMonthOrders = await Order.find({
      status: "archived",
      timestamp: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth },
    }).populate("table");

    // Filter by superClientId for the previous month
    const previousMonthFilteredOrders = previousMonthOrders.filter((order) =>
      order.table.superClient.equals(superClientId)
    );

    // Calculate previous month revenue
    const previousMonthRevenue = previousMonthFilteredOrders.reduce(
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
    // Get the current date and set the time to the start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of the current day

    // Calculate the start date for the current week (6 days before today)
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 6); // 6 days before today

    // Set the end date to the end of today for the current week
    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999); // End of the current day

    // Calculate the previous week's start and end date
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(startDate.getDate() - 7); // Previous week's start

    const prevEndDate = new Date(startDate);
    prevEndDate.setHours(23, 59, 59, 999); // Previous week's end

    // Fetch current week's orders
    const currentWeekOrders = await Order.find({
      status: "archived",
      timestamp: { $gte: startDate, $lte: endDate },
    })
      .populate({
        path: "table",
        match: { superClient: superClientId },
      })
      .exec();

    // Fetch previous week's orders
    const prevWeekOrders = await Order.find({
      status: "archived",
      timestamp: { $gte: prevStartDate, $lte: prevEndDate },
    })
      .populate({
        path: "table",
        match: { superClient: superClientId },
      })
      .exec();

    // Filter orders that do not have a matching superClient
    const filteredCurrentWeekOrders = currentWeekOrders.filter(
      (order) => order.table !== null
    );
    const filteredPrevWeekOrders = prevWeekOrders.filter(
      (order) => order.table !== null
    );

    // Calculate total revenue for current and previous week
    const currentWeekRevenue = filteredCurrentWeekOrders.reduce(
      (total, order) => total + order.totalPrice,
      0
    );
    const prevWeekRevenue = filteredPrevWeekOrders.reduce(
      (total, order) => total + order.totalPrice,
      0
    );

    // Calculate growth rate between current and previous week
    const growthRate =
      prevWeekRevenue > 0
        ? ((currentWeekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100
        : 0;

    // Calculate daily revenue for each day in the current week
    const dailyRevenue = filteredCurrentWeekOrders.reduce((result, order) => {
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
  const defaultEndDate = new Date(currentDate.setHours(23, 59, 59, 999)); // End of today
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
    const orders = await Order.find({
      status: "archived",
      timestamp: { $gte: start, $lte: end },
    }).populate("table");

    const filteredOrders = orders.filter((order) =>
      order.table.superClient.equals(superClientId)
    );

    // If no orders found, return an appropriate response
    if (filteredOrders.length === 0) {
      return res
        .status(200)
        .json({ message: "No revenue found for the given date range." });
    }

    const revenue = filteredOrders.reduce((result, order) => {
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
    // Find orders with 'archived' status
    const orders = await Order.find({
      status: "archived",
    }).populate("table"); // Populate the table only

    // Filter orders to include only those related to the current super client
    const filteredOrders = orders.filter((order) =>
      order.table.superClient.equals(superClientId)
    );

    // Calculate revenue using the productDetails field directly
    const revenue = filteredOrders.reduce((result, order) => {
      order.products.forEach((productEntry) => {
        const { productDetails, quantity } = productEntry;

        // Ensure productDetails exists (in case products were deleted)
        if (productDetails) {
          const productId = productDetails._id.toString();
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

    // Find orders from the current year
    const orders = await Order.find({
      status: "archived",
      timestamp: {
        $gte: new Date(`${currentYear}-01-01T00:00:00Z`),
        $lt: new Date(`${currentYear + 1}-01-01T00:00:00Z`),
      },
    }).populate("table"); // Populate the table only

    // Filter orders to include only those related to the current super client
    const filteredOrders = orders.filter((order) =>
      order.table.superClient.equals(superClientId)
    );

    // Group revenue by product and month
    const revenue = filteredOrders.reduce((result, order) => {
      const month = new Date(order.timestamp).getMonth() + 1; // Get month from timestamp
      if (month > currentMonth) return result; // Skip future months

      order.products.forEach((productEntry) => {
        const { productDetails, quantity } = productEntry;

        // Ensure productDetails exists (in case products were deleted)
        if (productDetails) {
          const productId = productDetails._id.toString();
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
    // Find orders with 'archived' status
    const orders = await Order.find({
      status: "archived",
    }).populate("table"); // Populate the table only

    // Filter orders to include only those related to the current super client
    const filteredOrders = orders.filter((order) =>
      order.table.superClient.equals(superClientId)
    );

    // Calculate the total quantity sold using the productDetails field directly
    const products = filteredOrders.reduce((result, order) => {
      order.products.forEach((productEntry) => {
        const { productDetails, quantity } = productEntry;

        // Ensure productDetails exists (in case products were deleted)
        if (productDetails) {
          const productId = productDetails._id.toString();
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
  const superClientId = req.superClientId;
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
    }).populate("table"); // Populate the table only

    // Filter orders to include only those related to the current super client
    const filteredOrders = orders.filter((order) =>
      order.table.superClient.equals(superClientId)
    );

    // Calculate revenue using the productDetails field directly
    const revenue = filteredOrders.reduce((result, order) => {
      order.products.forEach((productEntry) => {
        const { productDetails, quantity } = productEntry;

        // Ensure productDetails exists (in case products were deleted)
        if (productDetails) {
          const productId = productDetails._id.toString();
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
          const { productDetails, quantity } = product;
          if (productDetails) {
            const productId = productDetails._id.toString();
            if (!dailyProductRevenue[day][productId]) {
              dailyProductRevenue[day][productId] = {
                productName: productDetails.name,
                totalRevenue: 0,
              };
            }
            dailyProductRevenue[day][productId].totalRevenue +=
              quantity * productDetails.price;
          }
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
