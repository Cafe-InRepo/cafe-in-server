const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  try {
    const decoded = jwt.verify(token, 'RyyTwyqhIytpayn9cYA1KpXbD2GV1h2q');
    req.userId = decoded.userId;
    req.role = decoded.role; // Add role to the request object
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};

module.exports = verifyToken;
