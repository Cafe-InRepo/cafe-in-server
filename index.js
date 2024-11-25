const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const productRoutes = require("./routes/productRoutes");
const helmet = require("helmet");
const menuRoutes = require("./routes/menuRoutes");
const userRoutes = require("./routes/userRoutes");
const tablesRoutes = require("./routes/tableRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const sectionRoutes = require("./routes/sectionRoute");

const orderRoutes = require("./routes/orderRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const logger = require("./logger"); // Import the logger
const cloudinary = require("./Cloudinary/cloudinary");
const bodyParser = require("body-parser");
const http = require("http");
const socketIo = require("socket.io");

// Initialize express and create an HTTP server
const app = express();
const server = http.createServer(app);

const cors = require("cors");
// Initialize socket.io with CORS settings
const io = socketIo(server, {
  cors: {
    origin: "*", // Specify your client URL if it's different
    methods: ["GET", "POST"],
  },
});

// Enable CORS
app.use(
  cors({
    origin: "*", // Allow only this specific origin
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true, // Include this if you need to allow credentials like cookies or HTTP authentication
  })
);

// Middleware
app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(helmet());

// Attach io instance to req object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Mongoose connection
dotenv.config();
const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    logger.info("Connected to MongoDB");
  } catch (error) {
    logger.error("Error connecting to MongoDB: ", error);
    throw error;
  }
};

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected");
});

mongoose.connection.on("connected", () => {
  logger.info("MongoDB connected");
});

// Log incoming requests
app.use((req, res, next) => {
  logger.info(`Received request: ${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/auth", userRoutes);
app.use("/tables", tablesRoutes);
app.use("/categories", categoryRoutes);
app.use("/sections", sectionRoutes);
app.use("/products", productRoutes);
app.use("/order", orderRoutes);
app.use("/menu", menuRoutes);
app.use("/dashboard", dashboardRoutes);

// Notification support
io.on("connection", (socket) => {
  socket.on("supportRequest", (data) => {
    logger.info(`Support request from Table ${data.tableNumber}`);

    // Broadcast the support request to all admin/dashboard clients
    io.emit("supportNotification", { tableNumber: data.tableNumber });
  });

  // Handle call answer from admin/dashboard
  socket.on("supportCallAnswered", (data) => {
    io.emit("callAnswered", { tableNumber: data.tableNumber });
  });

  socket.on("disconnect", () => {
    logger.info("Client disconnected");
  });
});

// Start the server
const port = process.env.PORT || 5000;
server.listen(port, () => {
  connect();
  logger.info(`Server is running on port ${port}`);
});
