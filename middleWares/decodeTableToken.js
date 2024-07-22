const jwt = require("jsonwebtoken");

const decodeTableToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  console.log(token);
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY); // Use your JWT secret key
    req.superClientId = decoded.table.superClient; // Assuming the token contains the superClientId
    req.tableId = decoded.table.id;
    console.log(decoded.table.superClient);
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = decodeTableToken;
