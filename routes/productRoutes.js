const express = require("express");

const {
  createProduct,
  deleteProduct,
  updateProduct,
} = require("../controllers/ProductController");
const verifySuperClient = require("../middleWares/VerifySuperClient");
const router = express.Router();

// Define routes for User model
router.post("/", verifySuperClient, createProduct); // Create a new user
router.put("/:productId", verifySuperClient, updateProduct);
router.delete("/:productId", verifySuperClient, deleteProduct);

module.exports = router;
