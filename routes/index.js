var express = require('express');
var router = express.Router();

var { verifyToken } = require('../middlewares/authorization')
var { apiCommonLimiter } = require('../middlewares/apiRateLimit')

const userModel = require('../model/user_model')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// 토큰 검증
router.get('/verify-token', verifyToken, 
  async (req, res, next) => {
    let userInfo = await userModel.findOne({ _id: res.locals.userObjectId }, { isActiveMatching: 1, roleName: 1 } )

    let resUserInfo = {
      isAdmin: userInfo.roleName === 'admin' ? true: false,
      isActiveMatching: userInfo.isActiveMatching,
    }

    res.status(200).json({
      result: 'ok',
      userInfo: resUserInfo,
    })
  }
);

module.exports = router;
