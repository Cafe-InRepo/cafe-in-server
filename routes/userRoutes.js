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
  getClientsBySuperClientId,
  createUser,
  deleteUser,
  updateUser,
  changeUserVerificationStatus,
} = require("../controllers/UserController");
const verifyToken = require("../middleWares/jerifyToken");
const verifySuperClient = require("../middleWares/VerifySuperClient");
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

//routes for superClient
router.get(
  "/superClient/getUsers",
  verifySuperClient,
  getClientsBySuperClientId
);
router.post("/superClient/create-user", verifySuperClient, createUser);
router.delete("/superClient/:id", verifySuperClient, deleteUser);
router.put("/superClient/:id", verifySuperClient, updateUser);
router.patch("/superClient/:id/verify", changeUserVerificationStatus);

module.exports = router;
