const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const productRoutes = require("./routes/productRoutes");
const helmet = require("helmet");
const menuRoutes = require("./routes/menuRoutes");
const userRoutes = require("./routes/userRoutes");
const orderRoutes = require("./routes/orderRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
//const Delivery = require("./models/Delivery");
const app = express();
const cloudinary = require("./Cloudinary/cloudinary");
const bodyParser = require("body-parser");

//cors
const cors = require("cors");
app.use(cors());
// Middleware
app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
// Use Helmet to set various security headers
app.use(helmet());

//mongoose connection
dotenv.config();
const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log("connected to mdb");
  } catch (error) {
    throw error;
  }
};

mongoose.connection.on("disconnected", () => {
  console.log("db disconnected ");
});

mongoose.connection.on("connected", () => {
  console.log("db connected ");
});

app.use("/auth", userRoutes);
app.use("/products", productRoutes);
app.use("/order", orderRoutes);
app.use("/menu", menuRoutes);

app.use("/dashboard", dashboardRoutes);

const port = process.env.PORT;
app.listen(port, () => {
  connect();
  console.log("listening on port: " + port);
});
