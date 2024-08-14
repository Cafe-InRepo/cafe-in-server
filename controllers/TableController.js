const Order = require("../models/Order");
const Table = require("../models/Table");

// Create a new table
const createTable = async (req, res) => {
  try {
    const superClient = req.superClientId;
    const { number } = req.body;

    // Check if a table with the same number already exists for this superClient
    const existingTable = await Table.findOne({ number, superClient });

    if (existingTable) {
      return res.status(400).json({ error: "Table number already exists" });
    }

    // If no existing table, create a new one
    const newTable = new Table({
      number,
      superClient,
    });

    const savedTable = await newTable.save();
    res.status(201).json(savedTable);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all tables for the authenticated user
const getTables = (req, res) => {
  Table.find({ user: req.userId })
    .then((tables) => res.json(tables))
    .catch((error) => res.status(500).json({ error: error.message }));
};

// Update a table
const updateTable = (req, res) => {
  Table.findOneAndUpdate({ _id: req.params.id, user: req.userId }, req.body, {
    new: true,
  })
    .then((table) => {
      if (!table) {
        return res.status(404).send("Table not found");
      }
      res.json(table);
    })
    .catch((error) => res.status(500).json({ error: error.message }));
};

// Delete a table
const deleteTable = (req, res) => {
  Table.findOneAndDelete({ _id: req.params.id, user: req.userId })
    .then((table) => {
      if (!table) {
        return res.status(404).send("Table not found");
      }
      res.status(204).send();
    })
    .catch((error) => res.status(500).json({ error: error.message }));
};

const getTablesWithUnpaiedOrders = async (req, res) => {
  try {
    const tables = await Table.find({
      superClient: req.superClientId,
    }).populate({
      path: "orders",
      match: { payed: false }, // Only populate unpaid orders
    });

    const tablesWithUnpaidOrders = tables.map((table) => ({
      ...table.toObject(),
      unpaidOrders: table.orders.length > 0,
    }));

    res.status(200).json(tablesWithUnpaidOrders);
  } catch (err) {
    res.status(500).json({
      message: "Error fetching tables with unpaid orders",
      error: err.message,
    });
  }
};
const getTableById = async (req, res) => {
  try {
    const { id } = req.params;
    const superClient = req.superClientId;

    // Find the table by ID and ensure it belongs to the authenticated superClient
    const table = await Table.findOne({ _id: id, superClient }).populate(
      "orders"
    );

    if (!table) {
      console.log(
        `Table with ID: ${id} not found or does not belong to SuperClient ID: ${superClient}`
      );
      return res.status(404).json({ error: "Table not found" });
    }

    // Populate orders and their associated products
    await Order.populate(table, {
      path: "orders.products.product", // Assuming each order has a products array with a product reference
      model: "Product", // Ensure the model name is correct
    });

    res.status(200).json(table);
  } catch (error) {
    console.error(`Error fetching table details: ${error.message}`);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

module.exports = {
  createTable,
  getTables,
  updateTable,
  deleteTable,
  getTablesWithUnpaiedOrders,
  getTableById,
};
