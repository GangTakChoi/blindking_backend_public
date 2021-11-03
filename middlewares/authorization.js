const jwt = require('jsonwebtoken');
const YOUR_SECRET_KEY = process.env.SECRET_KEY;
const userModel = require('../model/user_model')

exports.setUserInfo = async (req, res, next) => {
  try {
    const clientToken = req.cookies.token;

    if (!clientToken) {
      next()
      return
    }

    const decoded = jwt.verify(clientToken, YOUR_SECRET_KEY);

    if (!decoded) {
      next()
      return
    }

    res.locals.userId = decoded.id;
    res.locals.userObjectId = decoded.objectId;
    res.locals.userNickname = decoded.nickname;
    res.locals.roleName = decoded.roleName;
    next();
  } catch (error) {
    console.log(error)
    res.status(401).json({ errorMessage: 'server error' });
  }
}

exports.verifyToken = async (req, res, next) => {
  try {
    const clientToken = req.cookies.token;

    if (!clientToken) {
      res.status(401).json({ errorMessage: 'unauthorized' });
      return
    }

    const decoded = jwt.verify(clientToken, YOUR_SECRET_KEY);

    if (!decoded) {
      res.clearCookie('token');
      res.status(401).json({ errorMessage: 'unauthorized' });
      return
    }

    let userInfo = await userModel.findOne({_id: decoded.objectId}, { activeStopPrieodLastDate: 1 })

    if (Date.now() < userInfo.activeStopPrieodLastDate.getTime()) {
      let dateInfo = userInfo.activeStopPrieodLastDate
      res.clearCookie('token');
      res.status(401).json({ 
        errorMessage: `신고처리된 회원입니다.\n[${dateInfo.getFullYear()}-${dateInfo.getMonth()+1}-${dateInfo.getDate()} ${dateInfo.getHours()}:${dateInfo.getMinutes()}]까지 정지기간 입니다.` 
      });
      return
    }

    res.locals.userId = decoded.id;
    res.locals.userObjectId = decoded.objectId;
    res.locals.userNickname = decoded.nickname;
    res.locals.roleName = decoded.roleName;
    next();
  } catch (err) {
    console.log(err)
    res.clearCookie('token');
    res.status(401).json({ errorMessage: '로그인 세션이 만료되었습니다.' });
  }
};

exports.verifyAdminToken = (req, res, next) => {
  try {
    const clientToken = req.cookies.token;
    const decoded = jwt.verify(clientToken, YOUR_SECRET_KEY);

    if (decoded && decoded.roleName === 'admin') {
      res.locals.userId = decoded.id;
      res.locals.userObjectId = decoded.objectId;
      res.locals.userNickname = decoded.nickname;
      res.locals.roleName = decoded.roleName;
      next();
    } else {
      res.status(401).json({ errorMessage: 'unauthorized' });
    }
  } catch (err) {
    res.status(401).json({ errorMessage: '로그인 세션이 만료되었습니다.' })
  }
}
