require('dotenv').config()
const jwt = require('jsonwebtoken');
const YOUR_SECRET_KEY = process.env.SECRET_KEY;

const verifyToken = (req, res, next) => {
  try {
    const clientToken = req.cookies.token;
    const decoded = jwt.verify(clientToken, YOUR_SECRET_KEY);
    if (decoded) {
      res.locals.userId = decoded.id;
      next();
    } else {
      res.status(401).json({ error: 'unauthorized' });
    }
  } catch (err) {
    res.status(401).json({ error: 'token expired' });
  }
};

exports.verifyToken = verifyToken;

