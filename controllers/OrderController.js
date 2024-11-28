const Order = require("../models/Order");
const Product = require("../models/Product");
const Table = require("../models/Table");
const logger = require("../logger");
const { default: mongoose } = require("mongoose");

const calculateTotalPrice = async (products) => {
  const productIds = products.map((item) => item.product);

  const existingProducts = await Product.find({ _id: { $in: productIds } });
  return products.reduce((total, item) => {
    const product = existingProducts.find((p) => p._id.equals(item.product));
    if (!product) {
      logger.warn(`Product with ID ${item.product} not found in the database.`);
      return total;
    }
    return total + product.price * item.quantity;
  }, 0);
};

const calculateTotalPriceCreating = async (products) => {
  const productIds = products.map((item) => item.product);

  const existingProducts = await Product.find({ _id: { $in: productIds } });
  return products.reduce((total, item) => {
    const product = existingProducts.find((p) => p._id.equals(item.product));
    if (!product) {
      logger.warn(`Product with ID ${item.product} not found in the database.`);
      return total;
    }
    return total + product.price * item.quantity;
  }, 0);
};

const createOrder = async (req, res) => {
  try {
    const { products } = req.body;
    const tableId = req.tableId || req.body.tableId;
    const userId = req.user;
    if (!products) {
      logger.warn("Products are required to create an order");
      return res.status(400).json({ error: "Products are required" });
    }

    const table = await Table.findById(tableId);
    if (!table) {
      logger.warn(`Table with ID ${tableId} not found`);
      return res.status(404).json({ error: "Table not found" });
    }

    const productIds = products.map((item) => item.product);
    const existingProducts = await Product.find({ _id: { $in: productIds } });
    if (existingProducts.length !== products.length) {
      logger.warn("One or more products not found when creating order");
      return res.status(404).json({ error: "One or more products not found" });
    }

    // Check if all products are available
    const unavailableProducts = existingProducts.filter(
      (product) => !product.available
    );

    // Find unavailable products that were passed in the order
    const unavailableProductsInOrder = products.filter((item) =>
      unavailableProducts.some((product) => product._id.equals(item.product))
    );

    if (unavailableProductsInOrder.length > 0) {
      logger.warn("One or more products are not available when creating order");
      return res.status(400).json({
        error: "One or more products are not available",
        unavailableProducts: unavailableProductsInOrder.map((item) => ({
          productId: item.product,
          requestedQuantity: item.quantity,
        })), // Return IDs and requested quantities for clarity
      });
    }

    const totalPrice = await calculateTotalPriceCreating(products);
    console.log(totalPrice);
    const newOrder = new Order({
      products,
      table: table._id,
      totalPrice,
      user: userId,
      statusTimestamps: {
        pending: new Date(),
      },
    });

    await newOrder.save();

    // Update the table with the new order reference
    table.orders.push(newOrder._id);
    await table.save();

    logger.info(`Order created successfully for table ${table._id}`);

    // Emit order created event
    req.io.emit("newOrder", newOrder);

    res
      .status(201)
      .json({ message: "Order created successfully", order: newOrder });
  } catch (error) {
    logger.error("Error creating order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const tableId = req.tableId;
    const orders = await Order.find({
      table: tableId,
      status: { $ne: "archived" }, // Exclude orders with status 'archived'
    })
      .populate("products.product")
      .sort({ timestamp: -1 });

    if (!orders || orders.length === 0) {
      logger.warn(`No orders found for table ${tableId}`);
      return res.status(404).json({ error: "No orders found for this table" });
    }

    logger.info(`Fetched all orders for table ${tableId}`);
    res.status(200).json(orders);
  } catch (error) {
    logger.error("Error fetching all orders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId).populate("products.product");
    if (!order) {
      logger.warn(`Order with ID ${orderId} not found`);
      return res.status(404).json({ error: "Order not found" });
    }
    logger.info(`Fetched order with ID ${orderId}`);
    res.status(200).json(order);
  } catch (error) {
    logger.error(
      `Error fetching order with ID ${req.params.orderId}: ${error.message}`,
      error
    );
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { products, table, status, payed } = req.body;

    if (products && products.length === 0) {
      const deletedOrder = await Order.findByIdAndDelete(orderId);
      if (!deletedOrder) {
        logger.warn(
          `Order with ID ${orderId} not found when attempting to delete`
        );
        return res.status(404).json({ error: "Order not found" });
      }

      // Remove the order reference from the table
      await Table.findByIdAndUpdate(deletedOrder.table, {
        $pull: { orders: orderId },
      });

      logger.info(`Order with ID ${orderId} deleted successfully`);
      req.io.emit("newOrder", order);

      return res.status(200).json({ message: "Order deleted successfully" });
    }

    const updateData = { table, status, payed };
    if (products) {
      const totalPrice = await calculateTotalPrice(products);
      updateData.products = products;
      updateData.totalPrice = totalPrice;
    }

    const order = await Order.findByIdAndUpdate(orderId, updateData, {
      new: true,
    }).populate("products.product");
    if (!order) {
      logger.warn(
        `Order with ID ${orderId} not found when attempting to update`
      );
      return res.status(404).json({ error: "Order not found" });
    }
    logger.info(`Order with ID ${orderId} updated successfully`);
    req.io.emit("newOrder", order);

    res.status(200).json({ message: "Order updated successfully", order });
  } catch (error) {
    logger.error(
      `Error updating order with ID ${req.params.orderId}: ${error.message}`,
      error
    );
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findById(orderId);
    if (!order) {
      logger.warn(
        `Order with ID ${orderId} not found when attempting to delete`
      );
      return res.status(404).json({ error: "Order not found" });
    }

    await Order.findByIdAndDelete(orderId);

    // Remove the order reference from the table
    await Table.findByIdAndUpdate(order.table, {
      $pull: { orders: orderId },
    });

    logger.info(`Order with ID ${orderId} deleted successfully`);
    req.io.emit("newOrder", order);
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    logger.error(
      `Error deleting order with ID ${req.params.orderId}: ${error.message}`,
      error
    );
    res.status(500).json({ error: "Internal server error" });
  }
};

// const increaseProductQuantity = async (req, res) => {
//   try {
//     const orderId = req.params.orderId;
//     const productId = req.params.productId;

//     const order = await Order.findById(orderId).populate("products.product");
//     if (!order) {
//       logger.warn(
//         `Order with ID ${orderId} not found when attempting to increase product quantity`
//       );
//       return res.status(404).json({ error: "Order not found" });
//     }

//     const productIndex = order.products.findIndex((p) =>
//       p.product._id.equals(productId)
//     );
//     if (productIndex === -1) {
//       logger.warn(`Product with ID ${productId} not found in order ${orderId}`);
//       return res.status(404).json({ error: "Product not found in the order" });
//     }

//     order.products[productIndex].quantity += 1;
//     order.totalPrice = await calculateTotalPrice(order.products);
//     await order.save();
//     logger.info(
//       `Product quantity increased for product ${productId} in order ${orderId}`
//     );

//     res.status(200).json({ message: "Product quantity increased", order });
//   } catch (error) {
//     logger.error(
//       `Error increasing product quantity for product ${req.params.productId} in order ${req.params.orderId}: ${error.message}`,
//       error
//     );
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// const decreaseProductQuantity = async (req, res) => {
//   try {
//     const orderId = req.params.orderId;
//     const productId = req.params.productId;

//     const order = await Order.findById(orderId).populate("products.product");
//     if (!order) {
//       logger.warn(
//         `Order with ID ${orderId} not found when attempting to decrease product quantity`
//       );
//       return res.status(404).json({ error: "Order not found" });
//     }

//     const productIndex = order.products.findIndex((p) =>
//       p.product._id.equals(productId)
//     );
//     if (productIndex === -1) {
//       logger.warn(`Product with ID ${productId} not found in order ${orderId}`);
//       return res.status(404).json({ error: "Product not found in the order" });
//     }

//     if (order.products[productIndex].quantity > 1) {
//       order.products[productIndex].quantity -= 1;
//       order.totalPrice = await calculateTotalPrice(order.products);
//       await order.save();
//       logger.info(
//         `Product quantity decreased for product ${productId} in order ${orderId}`
//       );

//       res.status(200).json({ message: "Product quantity decreased", order });
//     } else {
//       logger.warn(
//         `Attempt to decrease quantity below 1 for product ${productId} in order ${orderId}`
//       );
//       res.status(400).json({ error: "Product quantity cannot be less than 1" });
//     }
//   } catch (error) {
//     logger.error(
//       `Error decreasing product quantity for product ${req.params.productId} in order ${req.params.orderId}: ${error.message}`,
//       error
//     );
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

const rateOrderProducts = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { ratings } = req.body;

    const order = await Order.findById(orderId).populate("products.product");
    if (!order) {
      logger.warn(
        `Order with ID ${orderId} not found when attempting to rate products`
      );
      return res.status(404).json({ error: "Order not found" });
    }

    const productsRated = order.products.filter(({ product }) =>
      ratings.hasOwnProperty(product._id.toString())
    );

    for (let { product } of productsRated) {
      product.rate =
        (product.rate * product.raters + ratings[product._id]) /
        (product.raters + 1);
      product.raters += 1;
      await product.save();
    }

    order.rated = true;
    await order.save();
    logger.info(`Products rated for order ${orderId}`);

    res.status(200).json({ message: "Ratings submitted successfully" });
  } catch (error) {
    logger.error(
      `Error rating products for order ${req.params.orderId}: ${error.message}`,
      error
    );
    res.status(500).json({ error: "Internal server error" });
  }
};
// Confirm payment for selected orders
const confirmSelectedPayments = async (req, res) => {
  const { orderIds } = req.body;
  console.log("Received order IDs:", orderIds);
  const superId = req.userId;
  console.log(superId);
  try {
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: "No valid order IDs provided" });
    }

    // Validate that each orderId is a valid ObjectId
    const validOrderIds = orderIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (validOrderIds.length === 0) {
      return res.status(400).json({ message: "No valid order IDs found" });
    }

    // Update the orders to mark them as paid
    const updatedOrders = await Order.updateMany(
      { _id: { $in: validOrderIds }, payed: false },
      { $set: { payed: true, user: superId } }
    );

    logger.info("Update Result:", updatedOrders); // Log the update result

    if (updatedOrders.nModified === 0) {
      return res.status(404).json({
        message:
          "No orders were updated. Orders may already be paid or invalid.",
      });
    }

    // Check if all orders for each table are paid, and if so, archive them
    const tablesToCheck = await Order.distinct("table", {
      _id: { $in: validOrderIds },
    });

    const archiveUpdates = await Promise.all(
      tablesToCheck.map(async (tableId) => {
        const unpaidOrders = await Order.find({ table: tableId, payed: false });

        if (unpaidOrders.length === 0) {
          // Archive all orders for this table
          return Order.updateMany(
            { table: tableId },
            { $set: { status: "archived", user: superId } }
          );
        }
      })
    );

    res.status(200).json({
      message:
        "Selected orders confirmed as paid, and relevant orders archived",
      updatedOrders,
      archiveUpdates,
    });
  } catch (error) {
    console.error("Error confirming selected payments:", error);
    res.status(500).json({
      message: "Error confirming selected payments",
      error: error.message,
    });
  }
};

const confirmSelectedProductsPayments = async (req, res) => {
  const { orderId, productIds } = req.body;
  const superId = req.userId;
  console.log(superId);
  try {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID provided" });
    }

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: "No valid product IDs provided" });
    }

    // Validate each productId and remove suffix
    const validProductIds = productIds
      .map((id) => id.split("-")[0]) // Remove instance suffix
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validProductIds.length === 0) {
      return res.status(400).json({ message: "No valid product IDs found" });
    }

    // Find the order and update the payment status of the specified products
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const updatedProducts = order.products.map((product) => {
      // Check if this product is one of the selected products
      if (validProductIds.includes(product.product.toString())) {
        // Calculate how many products are being paid for
        const selectedCount = productIds.filter(
          (id) => id.split("-")[0] === product.product.toString()
        ).length;

        // If there is still a remaining quantity to pay for
        if (product.payedQuantity < product.quantity) {
          const remainingQuantity = product.quantity - product.payedQuantity;
          const quantityToPay = Math.min(selectedCount, remainingQuantity); // Ensure we don't overpay

          product.payedQuantity += quantityToPay; // Update payedQuantity
        }
      }
      return product;
    });

    order.products = updatedProducts;

    // Check if all products in the order are fully paid, and if so, set order's payed status to true
    const allProductsPaid = order.products.every(
      (product) => product.payedQuantity >= product.quantity
    );

    if (allProductsPaid) {
      order.payed = true;
    }

    await order.save();

    // Check if the table associated with this order has any unpaid orders
    const unpaidOrders = await Order.find({ table: order.table, payed: false });

    // If no unpaid orders remain for the table, archive all orders for that table
    if (unpaidOrders.length === 0) {
      await Order.updateMany(
        { table: order.table },
        { $set: { status: "archived", user: superId } }
      );
    }

    res.status(200).json({
      message:
        "Selected products confirmed as paid, and table orders archived if needed",
      updatedOrder: order,
    });
  } catch (error) {
    console.error("Error confirming selected products payments:", error);
    res.status(500).json({
      message: "Error confirming selected products payments",
      error: error.message,
    });
  }
};

// Confirm payment for all unpaid orders associated with a table
// const confirmAllPayments = async (req, res) => {
//   const { tableId } = req.params;

//   try {
//     // Find the table with its unpaid orders
//     const table = await Table.findById(tableId).populate({
//       path: "orders",
//       match: { paid: false },
//     });

//     if (!table) {
//       return res.status(404).json({ message: "Table not found" });
//     }

//     // Get the IDs of the unpaid orders
//     const unpaidOrderIds = table.orders.map((order) => order._id);

//     if (unpaidOrderIds.length === 0) {
//       return res
//         .status(400)
//         .json({ message: "No unpaid orders found for this table" });
//     }

//     // Update all unpaid orders to mark them as paid
//     const updatedOrders = await Order.updateMany(
//       { _id: { $in: unpaidOrderIds } },
//       { $set: { paid: true } }
//     );

//     if (!updatedOrders.nModified) {
//       return res.status(404).json({
//         message:
//           "No orders were updated. Orders may already be paid or invalid.",
//       });
//     }

//     res
//       .status(200)
//       .json({ message: "All unpaid orders confirmed as paid", updatedOrders });
//   } catch (error) {
//     console.error("Error confirming all payments:", error);
//     res
//       .status(500)
//       .json({ message: "Error confirming all payments", error: error.message });
//   }
// };
const getOrdersBySuperClientIdFIFO = async (req, res) => {
  const superClientId = req.superClientId;

  try {
    // Find tables that match the superClientId
    const tables = await Table.find({ superClient: superClientId });
    // Extract table IDs
    const tableIds = tables.map((table) => table._id);

    // Find orders that match the table IDs, sorted by timestamp (FIFO), excluding archived orders
    const orders = await Order.find({
      table: { $in: tableIds },
      status: { $ne: "archived" },
    })
      .populate("products.product") // Populate the product details
      .populate("table") // Populate the table details
      .sort({ timestamp: 1 }); // Sorts orders by creation time in ascending order (FIFO)

    // Add status durations for each order
    const ordersWithDurations = orders.map((order) => {
      const statusDurations = order.getStatusDurations();
      console.log(statusDurations);
      return {
        ...order.toObject(),
        statusDurations, // Include the status durations in the response
      };
    });

    res.status(200).json(ordersWithDurations);
  } catch (error) {
    console.error("Error retrieving orders:", error);
    res.status(500).json({ message: "Failed to retrieve orders", error });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Validate the orderId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "Invalid Order ID" });
    }

    // Find the order by ID
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check the current status and only allow valid status changes
    if (order.status === "completed") {
      return res
        .status(400)
        .json({ error: "Cannot change status of a completed order" });
    }

    const validTransitions = {
      pending: "preparing",
      preparing: "completed",
    };

    if (status !== validTransitions[order.status]) {
      return res.status(400).json({ error: "Invalid status transition" });
    }

    // Update the order status
    order.status = status;
    await order.save();
    req.io.emit("orderUpdated", order);

    res.json({ message: "Order status updated successfully", order });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrder,
  updateOrder,
  deleteOrder,
  rateOrderProducts,
  confirmSelectedPayments,
  //confirmAllPayments,
  getOrdersBySuperClientIdFIFO,
  updateOrderStatus,
  confirmSelectedProductsPayments,
};
