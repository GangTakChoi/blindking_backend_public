const jwt = require('jsonwebtoken')
const userModel = require('../model/user_model')
const userFriendRequestModel = require('../model/user_friend_request_model')

exports.addUser = async function (req, res, next) {
  const userInfo = req.body
  userModel.create(userInfo)
  .then(user => res.status(201).json(user))
  .catch(err => res.status(500).send(err));
};

exports.createToken = async function (req, res, next) {
  try {
    const reqInfo = req.body
    const YOUR_SECRET_KEY = process.env.SECRET_KEY
    const userId = reqInfo.id
    const userPw = reqInfo.pw
    const userInfo = await userModel.findOneByIdPw(userId, userPw)

    if (userInfo !== null) {
      const token = jwt.sign(
        {id: userInfo.id},
        YOUR_SECRET_KEY,
        {expiresIn: '3h'}
      );
      res.cookie('token', token);
      res.status(201).json({
        result: 'ok',
        token
      });
    } else {
      res.status(400).json({ error: 'invalid user' });
    }
  } catch (err) {
    res.status(500).send(err)
  }
};

exports.setSelfIntroduction = async function (req, res, next) {
  const userId = res.locals.userId

  let userUpdateInfo = req.body
  userUpdateInfo.id = res.locals.userId
  
  userModel.updateById(userId, userUpdateInfo)
  .then(userInfo => {
    res.status(200).json({
      result: 'ok',
      userInfo: userInfo
    });
  })
  .catch(err => res.status(500).send(err));
};

exports.getUserInfo = async function (req, res, next) {
  const userId = res.locals.userId

  userModel.findOneById(userId)
  .then(userInfo => {
    if (userInfo !== null)
      res.status(200).json(userInfo)
    else
      res.status(401).json({ error: 'unauthorized' })
  })
  .catch(err => res.status(500).send(err));
};

exports.getMachingPartnerList = async function (req, res, next) {
  let userId = res.locals.userId
  let filter = {
    id: userId
  }
  let userInfo = await userModel.findOne(filter)

  // 이성 필터
  filter = {
    gender: !userInfo.gender
  }
  userModel.findAll(filter)
  .then(userList => {
    res.status(200).json(userList)
  })
  .catch(err => res.status(500).send(err));
}

exports.getMachingPartnerDetail = async function (req, res, next) {
  let userId = req.params.id
  let userDetailInfo = await userModel.findOneBy_Id(userId)
  res.status(200).json({
    userDetailInfo: userDetailInfo
  });
}

exports.requestFriend = async function (req, res, next) {
  try {
    let userId = res.locals.userId
    // 친구 유저의 고유 아이디
    let friend_Id = req.params.id

    let friendInfo =  await userModel.findOneBy_Id(friend_Id)
    if (friendInfo === null) {
      res.status(400).json({ "errorMessage": "invalid friend user id"})
    }

    let friendId = friendInfo.id

    let payload = {
      requestId: userId,
      receiveId: friendId,
      status: 'wait'
    }

    await userFriendRequestModel.create(payload)
    res.status(200).json({"result": "success"})
  } catch (err) {
    res.status(500).json({"result": "fail", "errorMessage": err})
  }
} 

exports.getSendRequestFriendList = async function (req, res, next) {
  try {
    let userId = res.locals.userId
    let SendRequestFriendList = await userFriendRequestModel.findOneByRequestId(userId)
    res.status(200).json({"SendRequestFriendList": SendRequestFriendList})
  } catch (err) {
    res.status(500).json({"result": "fail", "errorMessage": err})
  }
} 

exports.getReceiveRequestFriendList = async function (req, res, next) {
  res.status(200).json({
    result: 'ok'
  });
} 

exports.verifyToken = async function (req, res, next) {
  res.status(200).json({
    result: 'ok'
  });
} 
