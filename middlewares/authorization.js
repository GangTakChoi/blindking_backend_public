const jwt = require('jsonwebtoken');
const YOUR_SECRET_KEY = process.env.SECRET_KEY;

const verifyToken = (req, res, next) => {
  try {
    const clientToken = req.cookies.token;
    const decoded = jwt.verify(clientToken, YOUR_SECRET_KEY);
    if (decoded) {
      res.locals.userId = decoded.id;
      res.locals.userObjectId = decoded.objectId;
      res.locals.userNickname = decoded.nickname;
      next();
    } else {
      res.status(401).json({ errorMessage: 'unauthorized' });
    }
  } catch (err) {
    res.status(401).json({ errorMessage: '로그인 세션이 만료되었습니다.' });
  }
};

exports.verifyToken = verifyToken;

