const User = require("../models/User");
module.exports = async function restrictToWifi(req, res, next) {
  try {
    const proxyAuth = req.headers["x-proxy-auth"];
    const localIP = req.headers["x-verified-local-ip"];

    if (proxyAuth !== process.env.SECURE_TRANSACTION_TOKEN || !localIP) {
      return res.status(403).json({ message: "Invalid proxy request" });
    }

    // Optional: Check that localIP starts with a known prefix
    if (!localIP.startsWith("192.168.0.")) {
      return res.status(403).json({ message: "IP not from local network" });
    }

    next();
  } catch (error) {
    console.error("WiFi restriction middleware error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
