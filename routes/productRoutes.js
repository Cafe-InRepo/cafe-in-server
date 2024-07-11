const express = require("express");

const {
  createProduct,
  getAllProducts,
  deleteProduct,
  updateProduct,
} = require("../controllers/ProductController");
const verifyToken = require("../middleWares/jerifyToken");
const router = express.Router();

// Define routes for User model
router.post("/", createProduct); // Create a new user
router.get("/", verifyToken, getAllProducts);
router.put("/:productId", verifyToken, updateProduct);
router.delete("/delete/:productId", verifyToken, deleteProduct);

module.exports = router;
