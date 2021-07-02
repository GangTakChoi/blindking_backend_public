const jwt = require('jsonwebtoken')
const userModel = require('../model/user_model')
const userFriendsModel = require('../model/user_friends_model')
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
        {
          id: userInfo.id,
          objectId: userInfo._id
        },
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
    let myObjectId = res.locals.userObjectId
    let friendObjectId = req.params.userObjectId

    let friendUserInfo = await userModel.findOneBy_Id(friendObjectId)

    // 친구 id 유효성 체크
    if (friendUserInfo === null) {
      res.status(400).json({
        errorMessage: "invalid friend ID"
      })
    }

    // 친구의 나에 대한 친구관계 조회
    let filter = {
      userObjectId: friendObjectId,
      friendObjectId: myObjectId
    }

    let result = await userFriendsModel.findOne(filter)

    if (result !== null) {
      let status = result.status
      if (status === "reject") {
        await userFriendsModel.findOneAndUpdate(
          {_id: result._id}, 
          {status: "wait"}
        )
        res.status(200).json({result: "success"})
      } else if (status === 'accept') {
        res.status(200).json({result: "alreadyFriend"})
      } else if (status === 'block') {
        res.status(200).json({result: "blocked"})
      } else if (status === 'wait') {
        res.status(200).json({result: "alreadyRequested"})
      } else {
        res.status(200).json({result: "unkown"})
      }

      return
    } else {
      // 나에 대한 친구 정보
      let myAddInfo = {
        userObjectId: myObjectId,
        friendObjectId: friendObjectId,
        status: "request"
      }

      await userFriendsModel.create(myAddInfo)

      // 상대 친구의 나에 대한 정보
      let friendAddInfo = {
        userObjectId: friendObjectId,
        friendObjectId: myObjectId,
        status: "wait"
      }

      await userFriendsModel.create(friendAddInfo)

      res.status(200).json({result: "success"})

      return
    }
  
  } catch (err) {
    res.status(500).json({
      errorMessage: "server error"
    })
  }
} 

exports.acceptFriend = async function (req, res, next) {
  try {
    let myObjectId = res.locals.userObjectId
    let friendObjectId = req.params.userObjectId

    let friendUserInfo = await userModel.findOneBy_Id(friendObjectId)

    // 친구 id 유효성 체크
    if (friendUserInfo === null) {
      res.status(400).json({
        errorMessage: "invalid friend ID"
      })
      return
    }

    let filter = {
      userObjectId: myObjectId,
      friendObjectId: friendObjectId
    }

    let result = await userFriendsModel.findOne(filter)

    // 친구 요청 상태인지 유효성 체크
    if (result.status !== 'wait') {
      console.log("invalid request (status is not 'wait')")
      res.status(400).json({"errorMessage":"invalid request"})
      return
    }
    
    // 친구에 대한 상태로 승인으로 수정
    await userFriendsModel.findOneAndUpdate(
      {_id: result._id}, 
      {status: "accept"}
    )
    
    // 상대 친구의 나에 대한 상태 승인으로 수정
    await userFriendsModel.findOneAndUpdate(
      {userObjectId: friendObjectId, friendObjectId: myObjectId}, 
      {status: "accept"}
    )

    res.status(200).json({"result": "success"})
  } catch (err) {
    console.log(err)
    res.status(500).json({"errorMessage": "server error"})
  }
} 

exports.rejectFriend = async function (req, res, next) {
  try {
    let myObjectId = res.locals.userObjectId
    let friendObjectId = req.params.userObjectId

    let friendUserInfo = await userModel.findOneBy_Id(friendObjectId)

    // 친구 id 유효성 체크
    if (friendUserInfo === null) {
      res.status(400).json({
        errorMessage: "invalid friend ID"
      })
      return
    }

    let filter = {
      userObjectId: myObjectId,
      friendObjectId: friendObjectId
    }

    let result = await userFriendsModel.findOne(filter)

    if (result === null) {
      res.status(400).json({
        errorMessage: "invalid request"
      })
      return
    }

    await userFriendsModel.findOneAndUpdate(
      {_id: result._id}, 
      {status: "reject"}
    )

    res.status(200).json({"result": "success"})
  } catch (err) {
    res.status(500).json({"errorMessage": "server error"})
  }
} 

exports.blockFriend = async function (req, res, next) {
  try {
    let myObjectId = res.locals.userObjectId
    let friendObjectId = req.params.userObjectId

    let friendUserInfo = await userModel.findOneBy_Id(friendObjectId)

    // 친구 id 유효성 체크
    if (friendUserInfo === null) {
      res.status(400).json({
        errorMessage: "invalid friend ID"
      })
      return
    }

    let filter = {
      userObjectId: myObjectId,
      friendObjectId: friendObjectId
    }

    let result = await userFriendsModel.findOne(filter)

    if (result === null) {
      res.status(400).json({
        errorMessage: "invalid request"
      })
      return
    }

    await userFriendsModel.findOneAndUpdate(
      {_id: result._id}, 
      {status: "block"}
    )

    res.status(200).json({"result": "success"})
  } catch (err) {
    res.status(500).json({"errorMessage": "server error"})
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

exports.getFriendInfoList = async function (req, res, next) {
  try {
    let filter =  {
      userObjectId: res.locals.userObjectId,
      status: 'wait'
    }
  
    let friendRequestList = await userFriendsModel.find(filter).populate('friendObjectId').sort({"updatedAt": -1})
  
    let friendRequestInfoList = []
  
    if (friendRequestList !== null) {
      friendRequestList.forEach((friendRequestInfo) => {
        let friendInfo = {
          objectId: friendRequestInfo.friendObjectId._id,
          nickname: friendRequestInfo.friendObjectId.nickname
        }
    
        friendRequestInfoList.push(friendInfo)
      })
    }
  
    filter.status =  'accept'
  
    let friendAcceptList = await userFriendsModel.find(filter).populate('friendObjectId').sort({"updatedAt": -1})
  
    let friendAcceptInfoList = []
  
    if (friendAcceptList !== null) {
      friendAcceptList.forEach((friendAcceptInfo) => {
        let friendInfo = {
          objectId: friendAcceptInfo.friendObjectId._id,
          nickname: friendAcceptInfo.friendObjectId.nickname
        }
    
        friendAcceptInfoList.push(friendInfo)
      })
    }
  
    filter.status =  'block'
  
    let friendBlockList = await userFriendsModel.find(filter).populate('friendObjectId').sort({"updatedAt": -1})
  
    let friendBlockInfoList = []
  
    if (friendBlockList !== null) {
      friendBlockList.forEach((friendBlockInfo) => {
        let friendInfo = {
          objectId: friendBlockInfo.friendObjectId._id,
          nickname: friendBlockInfo.friendObjectId.nickname
        }
    
        friendBlockInfoList.push(friendInfo)
      })
    }

    res.status(200).json({
      "friendRequestedList": friendRequestInfoList,
      "friendAcceptList": friendAcceptInfoList,
      "friendBlockList": friendBlockInfoList
    });
  } catch (err) {
    res.status(500).json({
      errorMessage: "server error"
    });
    console.log(err)
  }
  
} 

exports.verifyToken = async function (req, res, next) {
  res.status(200).json({
    result: 'ok'
  });
} 
