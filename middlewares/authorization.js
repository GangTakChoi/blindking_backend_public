const jwt = require('jsonwebtoken');
const YOUR_SECRET_KEY = process.env.SECRET_KEY;
const createError = require('http-errors');
const userModel = require('../model/user_model')

exports.setUserInfo = async (req, res, next) => {
  try {
    let clientToken = req.headers['authorization'];
    if (typeof clientToken === 'string') clientToken = clientToken.replace('Bearer ', '')

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
    res.locals.gender = decoded.gender;
    next();
  } catch (error) {
    console.log(error)
    next(createError(500, 'server error'))
  }
}

exports.verifyToken = async (req, res, next) => {
  try {
    let clientToken = req.headers['authorization'];
    
    if (typeof clientToken === 'string') clientToken = clientToken.replace('Bearer ', '')

    if (!clientToken) {
      next(createError(401, '권한 없음'))
      return
    }

    const decoded = jwt.verify(clientToken, YOUR_SECRET_KEY);

    if (!decoded) {
      next(createError(401, '권한 없음'))
      return
    }

    let userInfo = await userModel.findOne(
      { _id: decoded.objectId }, 
      { activeStopPrieodLastDate: 1 }
    )

    // 활동정지 기간인 경우
    if (Date.now() < userInfo.activeStopPrieodLastDate.getTime()) {
      let dateInfo = userInfo.activeStopPrieodLastDate
      
      next(createError(401, `신고처리된 회원입니다.\n
      [${dateInfo.getFullYear()}-${dateInfo.getMonth()+1}-${dateInfo.getDate()} 
        ${dateInfo.getHours()}:${dateInfo.getMinutes()}]까지 정지기간입니다.`))
      return
    }

    res.locals.userId = decoded.id;
    res.locals.userObjectId = decoded.objectId;
    res.locals.userNickname = decoded.nickname;
    res.locals.roleName = decoded.roleName;
    res.locals.gender = decoded.gender;
    next();
  } catch (err) {
    console.log(err)

    let statusCode = 500
    let errorMessage = 'server error'

    if (err.name === 'TokenExpiredError') {
      statusCode = 401
      errorMessage = '로그인 세션이 만료되었습니다.'
    }

    next(createError(statusCode, errorMessage))
  }
};

exports.verifyAdminToken = (req, res, next) => {
  try {
    let clientToken = req.headers['authorization'];
    if (typeof clientToken === 'string') clientToken = clientToken.replace('Bearer ', '')

    const decoded = jwt.verify(clientToken, YOUR_SECRET_KEY);

    if (decoded && decoded.roleName === 'admin') {
      res.locals.userId = decoded.id;
      res.locals.userObjectId = decoded.objectId;
      res.locals.userNickname = decoded.nickname;
      res.locals.roleName = decoded.roleName;
      res.locals.gender = decoded.gender;
      next();
    } else {
      next(createError(401, '권한 없음'))
    }
  } catch (err) {
    console.log(err)
    let statusCode = 500
    let errorMessage = 'server error'

    if (err.name === 'TokenExpiredError') {
      statusCode = 401
      errorMessage = '로그인 세션이 만료되었습니다.'
    }

    next(createError(statusCode, errorMessage))
  }
}
