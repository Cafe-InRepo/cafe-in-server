const express = require("express");
const {
  register,
  login,
  uploadProfileImage,
  changePassword,
  CodeVerification,
  resendCode,
  getUserById,
  loginTable,
} = require("../controllers/UserController");
const verifyToken = require("../middleWares/jerifyToken");
const router = express.Router();

// Define routes for User model
router.post("/register", register); // Create a new user
router.post("/login", login); // login user
router.get("/get-user", verifyToken, getUserById);
router.post("/uploadProfileImage", verifyToken, uploadProfileImage);
router.put("/changepwd", verifyToken, changePassword);
router.post("/verifyUser", CodeVerification);
router.post("/resendcode", resendCode);
router.post("/login-table", loginTable);

module.exports = router;
