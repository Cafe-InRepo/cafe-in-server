const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const helmet = require("helmet");
const bodyParser = require("body-parser");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const logger = require("./logger"); // Custom logger
const User = require("./models/User"); // User model

// Route imports
const productRoutes = require("./routes/productRoutes");
const menuRoutes = require("./routes/menuRoutes");
const billRoutes = require("./routes/billRoutes");
const userRoutes = require("./routes/userRoutes");
const tablesRoutes = require("./routes/tableRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const sectionRoutes = require("./routes/sectionRoute");
const postRoutes = require("./routes/postRoutes");
const orderRoutes = require("./routes/orderRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

dotenv.config(); // Load environment variables

// Initialize express app and server
const app = express();
const server = http.createServer(app);

// Initialize socket.io with CORS
const io = socketIo(server, {
  cors: {
    origin: "*", // Update with specific client URL in production
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors({ origin: "*", methods: "GET,HEAD,PUT,PATCH,POST,DELETE" }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(helmet());

// Attach io instance to req object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// MongoDB connection
const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    logger.info("Connected to MongoDB");
  } catch (error) {
    logger.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected");
});
mongoose.connection.on("connected", () => {
  logger.info("MongoDB connected");
});

// Logging incoming requests
app.use((req, res, next) => {
  logger.info(`Incoming request: ${req.method} ${req.url}`);
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
app.use("/bills", billRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/posts", postRoutes);

io.on("connection", async (socket) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    logger.warn("No token provided in socket handshake");
    return socket.disconnect();
  }

  try {
    const SECRET_KEY = process.env.JWT_SECRET_KEY;
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded?.user?.id || decoded?.userId;
    const user = await User.findById(userId);

    if (!user) {
      logger.warn(`User with ID ${userId} not found`);
      return socket.disconnect();
    }

    if (user.role === "superClient") {
      // Superclient joins their own room
      socket.join(user._id.toString());
      logger.info(`SuperClient ${user.fullName} joined room ${user._id}`);
    } else if (user.role === "client" && user.superClient) {
      // Waiters join their superclient's room
      socket.join(user.superClient.toString());
      logger.info(
        `Client ${user.fullName} joined superClient room ${user.superClient}`
      );
    }

    // Support request handling
    socket.on("supportRequest", (data) => {
      console.log("requesting support");

      const { tableNumber } = data; // Only the table number is required from the client
      const superClientId =
        user.role === "client" ? user.superClient : user._id; // Determine the superClientId

      // Notify the SuperClient and their room
      io.to(superClientId.toString()).emit("supportNotification", {
        tableNumber,
      });

      logger.info(
        `Support request for Table ${tableNumber} sent to SuperClient ${superClientId}`
      );
    });

    // Call answer handling
    socket.on("supportCallAnswered", (data) => {
      const { tableNumber } = data; // Only the table number is required
      const superClientId =
        user.role === "client" ? user.superClient : user._id; // Determine the superClientId

      // Notify the SuperClient and their room
      io.to(superClientId.toString()).emit("callAnswered", { tableNumber });
      logger.info(
        `Call answered for Table ${tableNumber} by SuperClient ${superClientId}`
      );
    });

    socket.on("disconnect", () => {
      logger.info(`User ${user.fullName} disconnected`);
    });
  } catch (error) {
    logger.error("Invalid or expired token:", error);
    return socket.disconnect();
  }
});

// Start the server
const port = process.env.PORT || 5000;
server.listen(port, () => {
  connect();
  logger.info(`Server is running on port ${port}`);
});
