const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const router = express.Router();
const User = require("../models/User");
const Table = require("../models/Table");
const nodemailer = require("nodemailer");
const cloudinary = require("cloudinary").v2;

//send sms

const register = async (req, res) => {
  try {
    const { name, email, pwd, rpwd } = req.body;

    if (name == "" || email == "" || pwd == "") {
      return res.status(401).json({ error: "all fields ae required" });
    }
    // Validate email format using a regular expression
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(402).json({ error: "Invalid email format" });
    }
    if (pwd !== rpwd) {
      return res.status(406).json({ error: "please verify your password" });
    }
    const existingUser = await User.findOne({
      email,
    });
    if (existingUser) {
      if (existingUser.email === email) {
        console.log("exist");
        return res
          .status(400)
          .json({ error: "Client with this email already exists" });
      }
    }
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(pwd, saltRounds);

    const verificationCode = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit code

    // Create a new user
    const user = new User({
      fullName: name,
      email: email,
      password: hashedPassword,
      verificationCode: verificationCode,
      verified: false,
    });

    // Save the user to the database
    await user.save();
    res
      .status(201)
      .json({ message: "Client registered successfully", userId: user._id });

    // Send a verification email
    sendVerifEmail(email, verificationCode, res, name);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//send verification mail
const sendVerifEmail = (email, verificationCode, res, name) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail", // Specify your email service provider (e.g., Gmail, Outlook, etc.)
    auth: {
      user: "saadliwissem88@gmail.com", // Your email address
      pass: process.env.MAIL_SENDER_PASS, // Your email password or app-specific password
    },
  });

  const mailOptions = {
    from: "saadliwissem88@gmail.com",
    to: email,
    subject: " Cafe'In Account Verification",
    text: `Hello, ${name} in order to create an account please give back this verification code : ${verificationCode} to the administration  `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: "Failed to send verification email" });
    } else {
      console.log("Email sent: " + info.response);
      res.status(201).json({
        message: "Client registered successfully. Verification email sent.",
      });
    }
  });
};

//verification code
const CodeVerification = async (req, res) => {
  try {
    const verifyCode = async (userId, code) => {
      try {
        const user = await User.findById(userId);

        if (!user) {
          return { error: "User not found", code: 404 };
        }

        if (user.verificationCode !== code) {
          return { error: "Invalid verification code", code: 400 };
        }

        // Update user verification status
        user.verified = true;
        await user.save();

        return { message: "Client verified successfully", code: 200 };
      } catch (error) {
        console.error(error);
        return { error: "Internal server error", code: 500 };
      }
    };

    const { userId, code } = req.body;

    const result = await verifyCode(userId, code);

    if (result.error) {
      return res.status(result.code).json({ error: result.error });
    }

    res.status(result.code).json({ message: result.message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
//resend verification code
const resendCode = async (req, res) => {
  try {
    const { userId } = req.body;
    const newVerificationCode = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit code

    // Check if email and newVerificationCode are present
    if (!userId) {
      return res
        .status(400)
        .json({ error: "error occured please try again later" });
    }

    // Find the user by email
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Update the verification code for the user
    user.verificationCode = newVerificationCode;
    await user.save();

    // Perform operations with the provided email (e.g., sending verification email)
    sendVerifEmail(user.email, newVerificationCode); // You can pass user._id or any user identifier

    res.status(200).json({ message: "Verification code resent successfully" });
  } catch (error) {
    console.error("Error in resendCode:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, pwd } = req.body;

    // Validate input fields
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Compare the provided password with the hashed password in the database
    const passwordMatch = await bcrypt.compare(pwd, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check if the user is verified
    if (!user.verified) {
      return res
        .status(403)
        .json({ error: "Please verify your account", userId: user._id });
    }

    // Generate a JSON Web Token (JWT) for authentication
    const token = jwt.sign(
      { userId: user._id, role: user.role }, // Add role to the token payload
      "RyyTwyqhIytpayn9cYA1KpXbD2GV1h2q"
    );

    res.status(200).json({ token, name: user.fullName, id: user._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getUserById = async (req, res) => {
  try {
    const userId = req.userId;

    // Fetch user data from the database using the user ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return user data as the response
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const uploadProfileImage = async (req, res) => {
  try {
    const image = req.body.image; // Get image data from request body
    const userId = req.body.id; // Get user ID from request body

    // Upload profile image to Cloudinary with user ID as part of the file name
    const uploadedImage = await cloudinary.uploader.upload(image, {
      public_id: `profile_images/${userId}`, // Use user ID as part of the file name
      overwrite: true, // Allow overwriting existing image with same file name
      allowed_formats: ["jpg", "jpeg", "png"], // Allow only specific image formats
    });

    // Extract image URL from Cloudinary response
    const imageUrl = uploadedImage.secure_url;

    // Update user's profile image URL in the database
    await User.findByIdAndUpdate(userId, { img: imageUrl });

    // Send success response with updated user object
    res.status(200).json({ message: "Profile image uploaded successfully" });
  } catch (error) {
    console.error("Error uploading profile image:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const changePassword = async (req, res) => {
  try {
    const newPassword = req.body.newpwd;
    const userId = req.body.userId;
    const currentPassword = req.body.currentpwd;
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare the provided current password with the user's stored password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the user's password with the new hashed password
    user.password = hashedNewPassword;

    // Save the updated user to the database
    await user.save();

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// Forget password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate the email field
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate a reset token
    const code = Math.floor(100000 + Math.random() * 900000); // 1 hour from now

    // Send reset email
    const transporter = nodemailer.createTransport({
      service: "Gmail", // Specify your email service provider
      auth: {
        user: "saadliwissem88@gmail.com", // Your email address
        pass: process.env.MAIL_SENDER_PASS, // Your email password or app-specific password
      },
    });

    const mailOptions = {
      from: "saadliwissem88@gmail.com",
      to: email,
      subject: "Password Reset Request",
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
      this is you verification code ${code}\n\n
      If you did not request this, please ignore this email and your password will remain unchanged.\n`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        return res
          .status(500)
          .json({ error: "Failed to send password reset email" });
      } else {
        console.log("Email sent: " + info.response);
        res.status(200).json({ message: "Password reset email sent" });
      }
    });
    user.forgetPwdCode = code;
    await user.save();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { verificationCode, pwd, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ error: "Password reset token is invalid or has expired" });
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the user's password
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
const loginTable = async (req, res) => {
  const { email, password, tableNumber } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Compare the password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Check if the user is either a superClient or client
    if (user.role !== "superClient" && user.role !== "client") {
      return res.status(403).json({ msg: "User not authorized" });
    }

    // Find the table by number and ensure it belongs to the superClient
    const table = await Table.findOne({
      number: tableNumber,
      superClient: user.role === "superClient" ? user._id : user.superClient,
    });

    if (!table) {
      return res.status(400).json({ msg: "Table not found or not authorized" });
    }

    // Create and send JWT token
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
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
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
};
