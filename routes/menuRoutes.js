const express = require("express");

const {
  getMenu,
} = require("../controllers/MenuController");
const verifyToken = require("../middleWares/jerifyToken");
const router = express.Router();

// Define routes for User model
router.get("/", getMenu); 
module.exports = router;
