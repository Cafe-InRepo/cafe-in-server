const Order = require("../models/Order");
const Product = require("../models/Product");

const calculateTotalPrice = async (productIds) => {
  const products = await Product.find({ _id: { $in: productIds } });
  return products.reduce((total, product) => total + product.price, 0);
};

const createOrder = async (req, res) => {
  try {
    console.log(req.body);
    const { products, table } = req.body;

    // Validate required fields
    if (!products || !table) {
      return res.status(400).json({ error: "Products and table are required" });
    }

    // Check if the products exist
    const existingProducts = await Product.find({ _id: { $in: products } });
    if (existingProducts.length !== products.length) {
      return res.status(404).json({ error: "One or more products not found" });
    }

    // Calculate total price
    const totalPrice = await calculateTotalPrice(products);

    // Create a new Order instance
    const newOrder = new Order({
      products,
      table,
      totalPrice: totalPrice,
    });

    // Save the new order to the database
    await newOrder.save();

    res
      .status(201)
      .json({ message: "Order created successfully", order: newOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const tableId = "668c61cde9b9312b5189b0b6";
    const orders = await Order.find({ table: tableId })
      .populate("products")
      .sort({ timestamp: -1 });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: "No orders found for this table" });
    }

    res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log(orderId);
    const order = await Order.findById(orderId).populate("products");
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.status(200).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { products, table, status, payed } = req.body;

    // Calculate total price if products are updated
    let totalPrice;
    if (products) {
      totalPrice = await calculateTotalPrice(products);
    }

    const updateData = {
      products,
      table,
      status,
      payed,
      totalPrice,
    };

    const order = await Order.findByIdAndUpdate(orderId, updateData, {
      new: true,
    })
      .populate("products")
      .populate("table");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.status(200).json({ message: "Order updated successfully", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Find the order by ID
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Delete the order from the database
    await Order.findByIdAndDelete(orderId);

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrder,
  updateOrder,
  deleteOrder,
};
