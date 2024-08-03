const Order = require("../models/Order");
const Table = require("../models/Table");

// Create a new table
const createTable = (req, res) => {
  const newTable = new Table({
    number: req.body.number,
    user: req.userId,
  });

  newTable
    .save()
    .then((table) => res.status(201).json(table))
    .catch((error) => res.status(500).json({ error: error.message }));
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
    res
      .status(500)
      .json({
        message: "Error fetching tables with unpaid orders",
        error: err.message,
      });
  }
};

module.exports = {
  createTable,
  getTables,
  updateTable,
  deleteTable,
  getTablesWithUnpaiedOrders,
};
