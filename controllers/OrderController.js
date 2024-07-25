const Order = require("../models/Order");
const Product = require("../models/Product");
const logger = require("../logger");

const calculateTotalPrice = async (products) => {
  const productIds = products.map((item) => item.product);

  const existingProducts = await Product.find({ _id: { $in: productIds } });
  return products.reduce((total, item) => {
    const product = existingProducts.find((p) =>
      p._id.equals(item.product._id)
    );
    if (!product) {
      logger.warn(`Product with ID ${item.product._id} not found in the database.`);
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
    const table = req.tableId;
    if (!products) {
      logger.warn("Products are required to create an order");
      return res.status(400).json({ error: "Products are required" });
    }

    const productIds = products.map((item) => item.product);
    const existingProducts = await Product.find({ _id: { $in: productIds } });
    if (existingProducts.length !== products.length) {
      logger.warn("One or more products not found when creating order");
      return res.status(404).json({ error: "One or more products not found" });
    }

    const totalPrice = await calculateTotalPriceCreating(products);

    const newOrder = new Order({
      products,
      table,
      totalPrice,
    });

    await newOrder.save();
    logger.info(`Order created successfully for table ${table}`);

    // Emit order created event
    req.io.emit("orderCreated", newOrder);

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
    const orders = await Order.find({ table: tableId })
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
  let orderId;
  try {
    orderId = req.params.orderId;
    const order = await Order.findById(orderId).populate("products.product");
    if (!order) {
      logger.warn(`Order with ID ${orderId} not found`);
      return res.status(404).json({ error: "Order not found" });
    }
    logger.info(`Fetched order with ID ${orderId}`);
    res.status(200).json(order);
  } catch (error) {
    logger.error(`Error fetching order with ID ${orderId}: ${error.message}`, error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateOrder = async (req, res) => {
  let orderId;
  try {
    orderId = req.params.orderId;
    const { products, table, status, payed } = req.body;

    // Only check products array when it is provided in the request
    if (products !== undefined && products.length === 0) {
      const deletedOrder = await Order.findByIdAndDelete(orderId);
      if (!deletedOrder) {
        logger.warn(`Order with ID ${orderId} not found when attempting to delete`);
        return res.status(404).json({ error: "Order not found" });
      }
      logger.info(`Order with ID ${orderId} deleted successfully`);
      return res.status(200).json({ message: "Order deleted successfully" });
    }

    const updateData = {
      table,
      status,
      payed,
    };

    if (products !== undefined) {
      const totalPrice = await calculateTotalPrice(products);
      updateData.products = products;
      updateData.totalPrice = totalPrice;
    }

    const order = await Order.findByIdAndUpdate(orderId, updateData, {
      new: true,
    }).populate("products.product");

    if (!order) {
      logger.warn(`Order with ID ${orderId} not found when attempting to update`);
      return res.status(404).json({ error: "Order not found" });
    }
    logger.info(`Order with ID ${orderId} updated successfully`);

    // Emit order updated event only if the status was updated
    if (req.body.status !== undefined) {
      req.io.emit("orderUpdated", order);
    }

    res.status(200).json({ message: "Order updated successfully", order });
  } catch (error) {
    logger.error(`Error updating order with ID ${orderId}: ${error.message}`, error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteOrder = async (req, res) => {
  let orderId;
  try {
    orderId = req.params.orderId;

    const order = await Order.findById(orderId);
    if (!order) {
      logger.warn(`Order with ID ${orderId} not found when attempting to delete`);
      return res.status(404).json({ error: "Order not found" });
    }

    await Order.findByIdAndDelete(orderId);
    logger.info(`Order with ID ${orderId} deleted successfully`);

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    logger.error(`Error deleting order with ID ${orderId}: ${error.message}`, error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const increaseProductQuantity = async (req, res) => {
  let orderId, productId;
  try {
    orderId = req.params.orderId;
    productId = req.params.productId;

    const order = await Order.findById(orderId).populate("products.product");
    if (!order) {
      logger.warn(`Order with ID ${orderId} not found when attempting to increase product quantity`);
      return res.status(404).json({ error: "Order not found" });
    }

    const productIndex = order.products.findIndex((p) =>
      p.product._id.equals(productId)
    );
    if (productIndex === -1) {
      logger.warn(`Product with ID ${productId} not found in order ${orderId}`);
      return res.status(404).json({ error: "Product not found in the order" });
    }

    order.products[productIndex].quantity += 1;
    order.totalPrice = await calculateTotalPrice(order.products);
    await order.save();
    logger.info(`Product quantity increased for product ${productId} in order ${orderId}`);

    res.status(200).json({ message: "Product quantity increased", order });
  } catch (error) {
    logger.error(`Error increasing product quantity for product ${productId} in order ${orderId}: ${error.message}`, error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const decreaseProductQuantity = async (req, res) => {
  let orderId, productId;
  try {
    orderId = req.params.orderId;
    productId = req.params.productId;

    const order = await Order.findById(orderId).populate("products.product");
    if (!order) {
      logger.warn(`Order with ID ${orderId} not found when attempting to decrease product quantity`);
      return res.status(404).json({ error: "Order not found" });
    }

    const productIndex = order.products.findIndex((p) =>
      p.product._id.equals(productId)
    );
    if (productIndex === -1) {
      logger.warn(`Product with ID ${productId} not found in order ${orderId}`);
      return res.status(404).json({ error: "Product not found in the order" });
    }

    if (order.products[productIndex].quantity > 1) {
      order.products[productIndex].quantity -= 1;
      order.totalPrice = await calculateTotalPrice(order.products);
      await order.save();
      logger.info(`Product quantity decreased for product ${productId} in order ${orderId}`);

      res.status(200).json({ message: "Product quantity decreased", order });
    } else {
      logger.warn(`Attempt to decrease quantity below 1 for product ${productId} in order ${orderId}`);
      res.status(400).json({ error: "Product quantity cannot be less than 1" });
    }
  } catch (error) {
    logger.error(`Error decreasing product quantity for product ${productId} in order ${orderId}: ${error.message}`, error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const rateOrderProducts = async (req, res) => {
  let orderId;
  try {
    orderId = req.params.orderId;
    const { ratings } = req.body;

    const order = await Order.findById(orderId).populate("products.product");
    if (!order) {
      logger.warn(`Order with ID ${orderId} not found when attempting to rate products`);
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
    logger.error(`Error rating products for order ${orderId}: ${error.message}`, error);
    res.status500.json({ error: "Internal server error" });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrder,
  updateOrder,
  deleteOrder,
  increaseProductQuantity,
  decreaseProductQuantity,
  rateOrderProducts,
};
