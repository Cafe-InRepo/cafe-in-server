const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const router = express.Router();
const User = require("../models/User");
const Table = require("../models/Table");
const nodemailer = require("nodemailer");
const cloudinary = require("../Cloudinary/cloudinary");
const logger = require("../logger"); // Import the logger

const register = async (req, res) => {
  try {
    const { name, email, pwd, rpwd } = req.body;

    if (name === "" || email === "" || pwd === "") {
      logger.warn("All fields are required for registration");
      return res.status(401).json({ error: "All fields are required" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn("Invalid email format provided for registration");
      return res.status(402).json({ error: "Invalid email format" });
    }
    if (pwd !== rpwd) {
      logger.warn("Password and repeated password do not match");
      return res.status(406).json({ error: "Please verify your password" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn(`Client with email ${email} already exists`);
      return res
        .status(400)
        .json({ error: "Client with this email already exists" });
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(pwd, saltRounds);

    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    const user = new User({
      fullName: name,
      email: email,
      password: hashedPassword,
      verificationCode: verificationCode,
      verified: false,
    });

    await user.save();
    logger.info(`Client registered successfully with email ${email}`);
    res
      .status(201)
      .json({ message: "Client registered successfully", userId: user._id });

    sendVerifEmail(email, verificationCode, res, name);
  } catch (error) {
    logger.error("Error registering user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const sendVerifEmail = (email, verificationCode, res, name) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: "saadliwissem88@gmail.com",
      pass: process.env.MAIL_SENDER_PASS,
    },
  });

  const mailOptions = {
    from: "saadliwissem88@gmail.com",
    to: email,
    subject: " Cafe'In Account Verification",
    text: `Hello, ${name} in order to create an account please give back this verification code : ${verificationCode} to the administration`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      logger.error("Failed to send verification email:", error);
      return res
        .status(500)
        .json({ error: "Failed to send verification email" });
    } else {
      logger.info("Verification email sent: " + info.response);
      res.status(201).json({
        message: "Client registered successfully. Verification email sent.",
      });
    }
  });
};

const CodeVerification = async (req, res) => {
  try {
    const { userId, code } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      logger.warn(`User with ID ${userId} not found for verification`);
      return res.status(404).json({ error: "User not found" });
    }
    if (user.verificationCode !== code) {
      logger.warn(`Invalid verification code for user ${userId}`);
      return res.status(400).json({ error: "Invalid verification code" });
    }
    user.verified = true;
    await user.save();
    logger.info(`User with ID ${userId} verified successfully`);
    res.status(200).json({ message: "Client verified successfully" });
  } catch (error) {
    logger.error("Error verifying user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const resendCode = async (req, res) => {
  try {
    const { userId } = req.body;
    const newVerificationCode = Math.floor(100000 + Math.random() * 900000);

    if (!userId) {
      logger.warn("User ID is required to resend verification code");
      return res
        .status(400)
        .json({ error: "Error occurred, please try again later" });
    }

    const user = await User.findById(userId);
    if (!user) {
      logger.warn(
        `User with ID ${userId} not found for resending verification code`
      );
      return res.status(404).json({ error: "Client not found" });
    }
    user.verificationCode = newVerificationCode;
    await user.save();
    sendVerifEmail(user.email, newVerificationCode);
    logger.info(`Verification code resent successfully to user ${userId}`);
    res.status(200).json({ message: "Verification code resent successfully" });
  } catch (error) {
    logger.error("Error resending verification code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const login = async (req, res) => {
  try {
    // Get email and password from the request body
    let { email, password } = req.body;
    const pwd = password;

    // Normalize email: trim spaces and convert to lowercase
    email = email.trim().toLowerCase();

    // Validate request fields
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation errors in login request");
      return res.status(400).json({ errors: errors.array() });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`Invalid login attempt with email ${email}`);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check if password matches
    const passwordMatch = await bcrypt.compare(pwd, user.password);
    if (!passwordMatch) {
      logger.warn(`Invalid login attempt with email ${email}`);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check if user is verified
    if (!user.verified) {
      logger.warn(`Unverified user ${email} attempting to log in`);
      return res
        .status(403)
        .json({ error: "Please verify your account", userId: user._id });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "24h" }
    );

    logger.info(`User ${email} logged in successfully`);
    res.status(200).json({ token, name: user.fullName, id: user._id });
  } catch (error) {
    logger.error("Error logging in user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getUserById = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      logger.warn(`User with ID ${userId} not found`);
      return res.status(404).json({ message: "User not found" });
    }

    logger.info(`Fetched data for user ${userId}`);
    res.status(200).json(user);
  } catch (error) {
    logger.error("Error fetching user data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getPlaceDetails = async (req, res) => {
  try {
    const userId = req.superClientId;
    const user = await User.findById(userId);
    if (!user) {
      logger.warn(`User with ID ${userId} not found`);
      return res.status(404).json({ message: "User not found" });
    }

    logger.info(`Fetched data for user ${userId}`);
    res.status(200).json(user);
  } catch (error) {
    logger.error("Error fetching user data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const uploadProfileImage = async (req, res) => {
  try {
    const image = req.body.image;
    const userId = req.body.id;

    const uploadedImage = await cloudinary.uploader.upload(image, {
      public_id: `profile_images/${userId}`,
      overwrite: true,
      allowed_formats: ["jpg", "jpeg", "png"],
    });

    const imageUrl = uploadedImage.secure_url;
    await User.findByIdAndUpdate(userId, { img: imageUrl });

    logger.info(`Profile image uploaded successfully for user ${userId}`);
    res.status(200).json({ message: "Profile image uploaded successfully" });
  } catch (error) {
    logger.error("Error uploading profile image:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { newPassword, userId, currentPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      logger.warn(`User with ID ${userId} not found for password change`);
      return res.status(404).json({ message: "User not found" });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      logger.warn(`Incorrect current password for user ${userId}`);
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashedNewPassword;
    await user.save();

    logger.info(`Password changed successfully for user ${userId}`);
    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    logger.error("Error changing password:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      logger.warn("Email is required for password reset");
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`Password reset requested for non-existent email ${email}`);
      return res.status(404).json({ error: "User not found" });
    }

    const code = Math.floor(100000 + Math.random() * 900000);

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: "saadliwissem88@gmail.com",
        pass: process.env.MAIL_SENDER_PASS,
      },
    });

    const mailOptions = {
      from: "saadliwissem88@gmail.com",
      to: email,
      subject: "Password Reset Request",
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
      This is your verification code: ${code}\n\n
      If you did not request this, please ignore this email and your password will remain unchanged.\n`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        logger.error("Failed to send password reset email:", error);
        return res
          .status(500)
          .json({ error: "Failed to send password reset email" });
      } else {
        logger.info("Password reset email sent: " + info.response);
        res.status(200).json({ message: "Password reset email sent" });
      }
    });
    user.forgetPwdCode = code;
    await user.save();
  } catch (error) {
    logger.error("Error in forgotPassword:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { verificationCode, newPassword } = req.body;

    const user = await User.findOne({
      forgetPwdCode: verificationCode,
      // resetPasswordExpires: { $gt: Date.now() }, // This should be removed as it's not part of the provided model
    });

    if (!user) {
      logger.warn(`Invalid or expired password reset code`);
      return res
        .status(400)
        .json({ error: "Password reset token is invalid or has expired" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashedPassword;
    user.forgetPwdCode = undefined;
    await user.save();

    logger.info(`Password has been reset successfully for user ${user._id}`);
    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    logger.error("Error resetting password:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const loginTable = async (req, res) => {
  const { email, password, tableNumber } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`Invalid credentials provided for email ${email}`);
      console.log(`Invalid credentials provided for email ${email}`);

      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn(`Invalid credentials provided for email ${email}`);
      console.log(`Invalid credentials provided for email ${email}`);

      return res.status(400).json({ msg: "Invalid credentials" });
    }

    if (user.role !== "superClient" && user.role !== "client") {
      logger.warn(`Unauthorized login attempt by user ${email}`);
      console.log(`Unauthorized login attempt by user ${email}`);

      return res.status(403).json({ msg: "User not authorized" });
    }
    if (user.verified !== true) {
      logger.warn(`user ${email} is not active and trying to open a table`);
      console.log(`user ${email} is not active and trying to open a table`);

      return res.status(403).json({ msg: "User not active" });
    }

    const table = await Table.findOne({
      number: tableNumber,
      superClient: user.role === "superClient" ? user._id : user.superClient,
    });

    if (!table) {
      logger.warn(`Table not found or not authorized for email ${email}`);
      return res.status(400).json({ msg: "Table not found or not authorized" });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
      table: {
        id: table._id,
        number: table.number,
        superClient: table.superClient,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET_KEY,
      { expiresIn: "24h" },
      (err, token) => {
        if (err) throw err;
        logger.info(
          `User ${email} logged in successfully to table ${tableNumber}`
        );
        res.json({ token });
      }
    );
  } catch (err) {
    logger.error("Server error in loginTable:", err);
    res.status(500).send("Server error");
  }
};

//QR login

const qrLogin = async (req, res) => {
  const { token } = req.body; // Get the token from the request body
  try {
    // Verify the token and decode the payload
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Extract the table number and superClient from the decoded token payload
    const { number: tableNumber, superClient } = decodedToken;

    // Find the table based on the table number and superClient
    const tableData = await Table.findOne({
      number: tableNumber,
      superClient: superClient,
    });

    if (!tableData) {
      return res.status(400).json({ msg: "Table not found or not authorized" });
    }

    // Fetch the superClient's details to get the place location
    const superClientData = await User.findById(superClient);

    if (!superClientData || superClientData.role !== "superClient") {
      return res
        .status(400)
        .json({ msg: "SuperClient not found or not authorized" });
    }

    const { placeName, placeLocation, distance } = superClientData; // Extract placeName and placeLocation

    // Create a session or token for the logged-in user
    const payload = {
      user: {
        id: decodedToken.superClient, // Get the user ID from the token
        role: "superClient", // Use the role for superClient
      },
      table: {
        id: tableData._id,
        number: tableData.number,
      },
    };

    // Sign and send the new token along with the place location
    jwt.sign(
      payload,
      process.env.JWT_SECRET_KEY,
      { expiresIn: "24h" },
      (err, newToken) => {
        if (err) throw err;

        res.json({
          token: newToken,
          message: "Logged in successfully",
          tableNumber: tableData.number,
          placeName, // Include the place name in the response
          placeLocation, // Include the place location in the response
          distance,
        });
      }
    );
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getClientsBySuperClientId = async (req, res) => {
  try {
    const superClientId = req.superClientId; // Retrieved from the middleware

    if (!superClientId) {
      logger.warn("SuperClient ID is required to fetch clients");
      return res.status(400).json({ error: "SuperClient ID is required" });
    }

    const clients = await User.find({
      role: "client",
      superClient: superClientId,
    });

    if (!clients.length) {
      logger.warn(`No clients found for SuperClient ID ${superClientId}`);
      return res.status(404).json({ message: "No clients found" });
    }

    logger.info(`Fetched clients for SuperClient ID ${superClientId}`);
    res.status(200).json(clients);
  } catch (error) {
    logger.error("Error fetching clients:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const createUser = async (req, res) => {
  const { fullName, email, password } = req.body;

  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Check if user with the same email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    logger.warn(`User with email ${email} already exists`);
    return res
      .status(400)
      .json({ error: "User with this email already exists" });
  }

  try {
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user object
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      superClient: req.superClientId, // Link the client to the superClient
    });

    // Save user to the database
    await newUser.save();

    logger.info(
      `User ${email} created successfully by superClient ${req.superClientId}`
    );
    res
      .status(201)
      .json({ message: "User created successfully", userId: newUser._id });
  } catch (error) {
    logger.error("Error creating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      logger.warn(`User with ID ${userId} not found for deletion`);
      return res.status(404).json({ message: "User not found" });
    }

    logger.info(`User with ID ${userId} deleted successfully`);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    logger.error("Error deleting user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const changeUserVerificationStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    const { verified } = req.body;

    if (typeof verified !== "boolean") {
      return res
        .status(400)
        .json({ message: "Invalid 'verified' value. Must be a boolean." });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { verified },
      { new: true }
    );

    if (!user) {
      logger.warn(
        `User with ID ${userId} not found for verification status update`
      );
      return res.status(404).json({ message: "User not found" });
    }

    logger.info(
      `User with ID ${userId} verification status updated successfully`
    );
    res
      .status(200)
      .json({ message: "User verification status updated successfully", user });
  } catch (error) {
    logger.error("Error updating user verification status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const role = req.role;
    const {
      fullName,
      email,
      password,
      superClient,
      phoneNumber,
      contractNumber,
      percentage,
      placeName,
      longitude,
      latitude,
    } = req.body;

    // Initialize update data with fields that can always be updated
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;
    if (role) updateData.role = role;

    // Handle password hashing if provided
    if (password) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updateData.password = hashedPassword;
    }

    // Role-specific updates
    if (role === "client") {
      if (superClient !== undefined)
        updateData.superClient = superClient || null; // Set to null if empty
    } else if (role === "superClient") {
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
      if (contractNumber !== undefined)
        updateData.contractNumber = contractNumber;
      if (percentage !== undefined) updateData.percentage = percentage;
      if (placeName !== undefined) updateData.placeName = placeName;

      // Handle placeLocation update (latitude and longitude)
      if (latitude && longitude) {
        updateData.placeLocation = {
          lat: latitude,
          long: longitude,
        };
      }
    }

    // Update the user in the database
    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    });

    if (!user) {
      logger.warn(`User with ID ${userId} not found for update`);
      return res.status(404).json({ message: "User not found" });
    }

    logger.info(`User with ID ${userId} updated successfully`);
    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    logger.error("Error updating user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  register,
  login,
  uploadProfileImage,
  changePassword,
  CodeVerification,
  resendCode,
  getUserById,
  loginTable,
  forgotPassword,
  resetPassword,
  getClientsBySuperClientId,
  createUser,
  updateUser,
  deleteUser,
  changeUserVerificationStatus,
  qrLogin,
  getPlaceDetails
};
