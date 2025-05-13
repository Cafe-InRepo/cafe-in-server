const User = require("../models/User");
module.exports = async function restrictToWifi(req, res, next) {
  try {
    const superClientId = req.superClientId;

    if (!superClientId) {
      return res.status(400).json({ message: "Missing superClientId" });
    }

    // Get user data from DB or service
    const user = await User.findById(superClientId);

    if (!user || !user.defaultIP) {
      return res.status(404).json({ message: "User or default IP not found" });
    }

    const expectedIPPrefix = user.defaultIP; // e.g., "192.168.10."
    console.log("expected ip:", expectedIPPrefix);
    // Get client IP
    const clientIP =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress;
    console.log("retived ip: ", clientIP);
    if (!clientIP.startsWith(expectedIPPrefix)) {
      return res.status(403).json({
        message: "You should be connected to the Wi-Fi.",
        clientIP,
        expectedPrefix: expectedIPPrefix,
      });
    }

    next(); // All good, proceed
  } catch (error) {
    console.error("WiFi restriction middleware error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
