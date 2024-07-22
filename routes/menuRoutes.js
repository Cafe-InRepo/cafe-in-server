const express = require("express");

const { getMenu } = require("../controllers/MenuController");
const verifyToken = require("../middleWares/jerifyToken");
const decodeTableToken = require("../middleWares/decodeTableToken");
const router = express.Router();

// Define routes for User model
router.get("/", decodeTableToken, getMenu);
module.exports = router;
