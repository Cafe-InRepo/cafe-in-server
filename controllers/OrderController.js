const Order = require("../models/Order");
const Product = require("../models/Product");

const calculateTotalPrice = async (products) => {
  const productIds = products.map((item) => item.product);

  const existingProducts = await Product.find({ _id: { $in: productIds } });
  return products.reduce((total, item) => {
    const product = existingProducts.find((p) =>
      p._id.equals(item.product._id)
    );
    if (!product) {
      console.error(
        `Product with ID ${item.product._id} not found in the database.`
      );
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
      console.error(
        `Product with ID ${item.product} not found in the database.`
      );
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
      return res.status(400).json({ error: "Products are required" });
    }

    const productIds = products.map((item) => item.product);
    const existingProducts = await Product.find({ _id: { $in: productIds } });
    if (existingProducts.length !== products.length) {
      return res.status(404).json({ error: "One or more products not found" });
    }

    const totalPrice = await calculateTotalPriceCreating(products);

    const newOrder = new Order({
      products,
      table,
      totalPrice,
    });

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
    const tableId = req.tableId;
    const orders = await Order.find({ table: tableId })
      .populate("products.product")
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
    const order = await Order.findById(orderId).populate("products.product");
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

    // Only check products array when it is provided in the request
    if (products !== undefined && products.length === 0) {
      const deletedOrder = await Order.findByIdAndDelete(orderId);
      if (!deletedOrder) {
        return res.status(404).json({ error: "Order not found" });
      }
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

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    await Order.findByIdAndDelete(orderId);

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const increaseProductQuantity = async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    const order = await Order.findById(orderId).populate("products.product");
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const productIndex = order.products.findIndex((p) =>
      p.product._id.equals(productId)
    );
    if (productIndex === -1) {
      return res.status(404).json({ error: "Product not found in the order" });
    }

    order.products[productIndex].quantity += 1;
    order.totalPrice = await calculateTotalPrice(order.products);
    await order.save();

    res.status(200).json({ message: "Product quantity increased", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const decreaseProductQuantity = async (req, res) => {
  try {
    const { orderId, productId } = req.params;

    const order = await Order.findById(orderId).populate("products.product");
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const productIndex = order.products.findIndex((p) =>
      p.product._id.equals(productId)
    );
    if (productIndex === -1) {
      return res.status(404).json({ error: "Product not found in the order" });
    }

    if (order.products[productIndex].quantity > 1) {
      order.products[productIndex].quantity -= 1;
      order.totalPrice = await calculateTotalPrice(order.products);
      await order.save();
      res.status(200).json({ message: "Product quantity decreased", order });
    } else {
      res.status(400).json({ error: "Product quantity cannot be less than 1" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
const rateOrderProducts = async (req, res) => {
  const { orderId } = req.params;
  const { ratings } = req.body;

  try {
    const order = await Order.findById(orderId).populate("products.product");
    if (!order) {
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

    res.status(200).json({ message: "Ratings submitted successfully" });
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
  increaseProductQuantity,
  decreaseProductQuantity,
  rateOrderProducts,
};
