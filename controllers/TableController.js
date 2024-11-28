const { baseUrl } = require("../Helpers/BaseUrl");
const Order = require("../models/Order");
const Table = require("../models/Table");
const jwt = require("jsonwebtoken");
const QRCode = require("qrcode");

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

    // Create payload for JWT, including the table number
    const payload = {
      tableId: savedTable._id,
      number: savedTable.number, // Add table number to token payload
      superClient: savedTable.superClient,
    };

    // Generate a JWT for the table
    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, {
      expiresIn: "24h",
    });

    // Generate QR code with the JWT token
    const qrCodeData = `${baseUrl}/login?token=${token}`;

    // Generate QR Code Image (base64 data URL)
    QRCode.toDataURL(qrCodeData, async (err, url) => {
      if (err) {
        return res.status(500).json({ error: "Failed to generate QR code" });
      }

      // Update the table with the QR code URL (base64 string)
      savedTable.qrCode = url;
      await savedTable.save();

      // Return the table details including the QR code
      res.status(201).json({
        table: savedTable,
        qrCodeUrl: url, // This is the generated QR code as a data URL
      });
    });
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


// Delete a table and its associated orders
const deleteTable = async (req, res) => {
  try {
    // Find the table by ID and userId
    const table = await Table.findOne({
      _id: req.params.id,
      user: req.userId,
    })

    if (!table) {
      return res.status(404).send("Table not found");
    }

    // Delete the table
    await Table.findByIdAndDelete(req.params.id);

    res.status(204).send(); // No content response after deletion
  } catch (error) {
    console.error("Error deleting table and orders:", error);
    res.status(500).json({ error: error.message });
  }
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
      qrCode: table.qrCode, // Include the QR code field
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
    const table = await Table.findOne({ _id: id, superClient }).populate({
      path: "orders",
      match: { status: { $ne: "archived" } }, // Exclude archived orders
      populate: {
        path: "products.product", // Populate the products in each order
        model: "Product", // Ensure the model name is correct
      },
    });

    if (!table) {
      console.log(
        `Table with ID: ${id} not found or does not belong to SuperClient ID: ${superClient}`
      );
      return res.status(404).json({ error: "Table not found" });
    }

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
