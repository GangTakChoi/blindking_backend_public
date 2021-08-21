const jwt = require('jsonwebtoken')
const userModel = require('../model/user_model')
const userFriendsModel = require('../model/user_friends_model')
const chattingRoomModel = require('../model/chatting_room')
const areaModel = require('../model/area_model')
const commonModel = require('../model/common_model')
const questionListModel = require('../model/question_list_model')

exports.addUser = async function (req, res, next) {
  try {
    const userId = req.body.id
    const userPw = req.body.pw
    const userNickname = req.body.nickname
    const userGender = req.body.gender
    const userQuestionList = []

    const quesiontInfoList = await questionListModel.find({ isDelete: false }, { _id: 1 }).sort({ order: 1 })

    quesiontInfoList.forEach((element) => {
      let questionInfo = {
        questionId: element._id,
        answer: ''
      }

      userQuestionList.push(questionInfo)
    })

    const userInfo = {
      id: userId,
      pw: userPw,
      nickname: userNickname,
      gender: userGender,
      questionList: userQuestionList,
    }

    await userModel.create(userInfo)

    res.status(201).json({ result: 'success' })
  } catch (e) {
    console.log(e)
    res.status(500).json({ errorMessage: 'server error' });
  }
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
          objectId: userInfo._id,
          nickname: userInfo.nickname,
        },
        YOUR_SECRET_KEY,
        {expiresIn: '3h'}
      );
      res.cookie('token', token);
      res.cookie('nickname', userInfo.nickname);
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
  try {
    const userId = res.locals.userId.body
    const userBirthYear = req.body.birthYear
    const userMBTI = req.body.mbti
    const userQuestionList = req.body.questionList

    // 유저 정보
    let userUpdateInfo = {
      birthYear: userBirthYear,
      mbti: userMBTI,
      questionList: userQuestionList,
      region: {}
    }

    let mbtiInfo = await commonModel.findOne({key:'mbti'})

    // mbti 유효성 검사
    if (!mbtiInfo.data.includes(userMBTI)) {
      res.status(400).json({ result: 'invaild request' });
      return
    }

    // 지역 정보
    if (req.body.rootAreaCode !== undefined && req.body.subAreaCode !== undefined) {
      let rootAreaCode = req.body.rootAreaCode
      let subAreaCode = req.body.subAreaCode

      let filter = {
        parentCode: rootAreaCode,
        code: subAreaCode
      }

      let result = await areaModel.findOne(filter)

      // 지역 코드 유효성 검사
      if (!result) {
        res.status(400).json({ result: 'invaild request' });
        return
      }

      userUpdateInfo.region.rootAreaCode = rootAreaCode
      userUpdateInfo.region.subAreaCode = subAreaCode
    }
    
    // 유저 정보 업데이트
    await userModel.updateById(userId, userUpdateInfo)

    res.status(200).json({ result: 'success' });
  } catch (e) {
    console.log(e)
    res.status(500).json({ errorMessage: 'server error' });
  }
};

exports.getUserInfo = async function (req, res, next) {
  try {
    const userId = res.locals.userId

    let userInfo = await userModel.findOneById(userId).populate('questionList.questionId', { updatedAt: 0, createdAt: 0 })

    if (!userInfo) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }

    let upperArea = await areaModel.find({ depth:0 }, { _id: 0 })
    let subArea = await areaModel.find({ depth:1 }).sort({ name: 1 })
    let mbtiInfo = await commonModel.findOne({ key:'mbti' })

    let response = {
      userInfo: {
        birthYear: userInfo.birthYear,
        mbti: userInfo.mbti,
        region: userInfo.region,
        questionList: userInfo.questionList,
      },
      regionInfo: {
        upperArea: upperArea,
        subArea: subArea
      },
      mbtiList: mbtiInfo.data
    }

    res.status(200).json(response)
  } catch (e) {
    console.log(e)
    res.status(500).json({ errorMessage: 'server error' })
  }
};

exports.getMachingPartnerList = async function (req, res, next) {
  try {
    let userId = res.locals.userId
    let userInfo = await userModel.findOne({id: userId})
    let userGender = userInfo.gender
    let userList = await userModel.find({gender: !userGender}, {birthYear:1, nickname:1,gender:1,mbti:1,questionList:1,region:1})
    .populate('questionList.questionId', { updatedAt: 0, createdAt: 0 })

    res.status(200).json(userList)
  } catch (e) {
    console.log(e)
    res.status(500).json({
      errorMessage: "server error"
    })
  }
}

exports.getMachingPartnerDetail = async function (req, res, next) {
  try {
    let userObjectId = req.params.id
    let userDetailInfo = await userModel.findOne({_id: userObjectId}, {birthYear:1, nickname:1,gender:1,mbti:1,questionList:1,region:1})
    .populate('questionList.questionId', { updatedAt: 0, createdAt: 0 })

    if (!userDetailInfo) {
      res.status(400).json({errorMessage: 'invalid request'})
    }

    res.status(200).json({
      userDetailInfo: userDetailInfo
    });

  } catch (e) {
    console.log(e)
    res.status(500).json({
      errorMessage: "server error"
    })
  }
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
        filter.userObjectId = myObjectId
        filter.friendObjectId = friendObjectId

        result = await userFriendsModel.findOne(filter)

        if (result.status === 'accept') {
          // 이미 친구관계인 경우
          res.status(200).json({result: "alreadyFriend"})
        } else {
          // 상대방은 accept 상태이지만 나는 아닌 경우

          await establisFriendRelation(myObjectId, friendObjectId, result.chattingRoomId)

          res.status(200).json({result: "establishFriend"})
        }

        
      } else if (status === 'block') {
        res.status(200).json({result: "blocked"})
      } else if (status === 'wait') {
        res.status(200).json({result: "alreadyRequested"})
      } else if (status === 'request') {
        filter.userObjectId = myObjectId
        filter.friendObjectId = friendObjectId

        result = await userFriendsModel.findOne(filter)
        status = result.status
        
        if (status === 'block') {
          res.status(200).json({result: "myBlock"})
        } else {

          await establisFriendRelation(myObjectId, friendObjectId, result.chattingRoomId)

          res.status(200).json({result: "acceptFriend"})
        }
      } else {
        res.status(400).json({result: "unkown"})
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
    console.log(err)
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

    await establisFriendRelation(myObjectId, friendObjectId, result.chattingRoomId)

    // let readedMessageCountInfos = [
    //   {userObjectId: myObjectId}, {userObjectId: friendObjectId}
    // ]

    // // 채팅방 생성
    // let chattingRoom = await chattingRoomModel.create({
    //   readedMessageCountInfos: readedMessageCountInfos
    // })
    // let chattingRoomId = chattingRoom._id
    
    // // 친구에 대한 상태로 승인으로 수정
    // await userFriendsModel.findOneAndUpdate(
    //   {_id: result._id}, 
    //   {
    //     status: "accept",
    //     chattingRoomId: chattingRoomId
    //   },
    // )
    
    // // 상대 친구의 나에 대한 상태 승인으로 수정
    // await userFriendsModel.findOneAndUpdate(
    //   {userObjectId: friendObjectId, friendObjectId: myObjectId}, 
    //   {
    //     status: "accept",
    //     chattingRoomId: chattingRoomId
    //   }
    // )

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

    result.status = "reject"

    await userFriendsModel.create(result)

    // 채팅방이 있는 경우 close 처리
    if (result.chattingRoomId !== null) {
      await chattingRoomModel.findOneAndUpdate(
        {_id: result.chattingRoomId}, 
        {isClose: true}
      )
    }

    // await userFriendsModel.findOneAndUpdate(
    //   {_id: result._id}, 
    //   {status: "reject"}
    // )

    res.status(200).json({"result": "success"})
  } catch (err) {
    console.log(err)
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
    
    // 채팅방이 있는 경우 close 처리
    if (result.chattingRoomId !== null) {
      await chattingRoomModel.findOneAndUpdate(
        {_id: result.chattingRoomId}, 
        {isClose: true}
      )
    }

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
    let userObjectId = res.locals.userObjectId

    // 친구 요청 대기 목록 조회
    let filter =  {
      userObjectId: userObjectId
    }
    
    let friendInfoList = await userFriendsModel.find(filter).populate('friendObjectId').populate('chattingRoomId').sort({"updatedAt": -1})

    let friendRequestInfoList = []
    let friendAcceptInfoList = []
    let friendBlockInfoList = []

    friendInfoList.forEach((friendInfo) => {
      let tempfriendInfo = {
        objectId: friendInfo.friendObjectId._id,
        nickname: friendInfo.friendObjectId.nickname
      }

      if (friendInfo.status === 'wait') {
        friendRequestInfoList.push(tempfriendInfo)
      }
      if (friendInfo.status === 'block') {
        friendBlockInfoList.push(tempfriendInfo)
      }
      if (friendInfo.status === 'accept') {
        let readMessageCount = 0

        friendInfo.chattingRoomId.readedMessageCountInfos.forEach((readedMessageCountInfo) => {
          if (String(readedMessageCountInfo.userObjectId) === userObjectId) {
            readMessageCount = readedMessageCountInfo.readedMessageCount
          }
        })

        tempfriendInfo.unreadMessageCount = friendInfo.chattingRoomId.messageRecords.length - readMessageCount

        friendAcceptInfoList.push(tempfriendInfo)
      }
    })

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

exports.releaseBlockFriend = async function (req, res, next) {
  try {
    let myObjectId = res.locals.userObjectId
    let friendObjectId = req.params.userObjectId

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

    res.status(200).json({
      result: 'success'
    });

  } catch (err) {
    res.status(500).json({
      errorMessage: "server error"
    });
    console.log(err)
  }
}

exports.modifyFriendStatus = async function (req, res, next) {
  try {
    let status = req.body.status
    let userObjectId = res.locals.userObjectId
    let friendObjectId = req.params.userObjectId

    // 친구 삭제 및 
    if (status !== 'reject' && status !== 'block') {
      res.status(400).json({
        errorMessage: "invalid request"
      })
      return
    }
    
    let filter = {
      userObjectId: userObjectId,
      friendObjectId: friendObjectId
    }

    let friendRelationInfo = await userFriendsModel.findOne(filter)

    if (friendRelationInfo === null) {
      res.status(400).json({
        errorMessage: "invalid request"
      })
      return
    }

    await userFriendsModel.findOneAndUpdate(
      {_id: friendRelationInfo._id}, 
      {status: status}
    )



    res.status(200).json({
      friendRelationInfo: friendRelationInfo
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

async function establisFriendRelation (myObjectId, friendObjectId, chattingRoomId = null) {

  // 채팅룸이 존재하는 경우 
  if (chattingRoomId !== null) {
    // 친구에 대한 상태로 승인으로 수정
    await userFriendsModel.findOneAndUpdate(
      { userObjectId: myObjectId, friendObjectId: friendObjectId },
      { status: "accept" },
    )
    
    // 상대 친구의 나에 대한 상태 승인으로 수정
    await userFriendsModel.findOneAndUpdate(
      { userObjectId: friendObjectId, friendObjectId: myObjectId }, 
      { status: "accept" }
    )
    
    // 채팅방 오픈
    await chattingRoomModel.findOneAndUpdate(
      { _id: chattingRoomId },
      { isClose: false }
    )

  // 채팅룸이 존재하지 않는 경우
  } else {
    let readedMessageCountInfos = [
      {userObjectId: myObjectId}, {userObjectId: friendObjectId}
    ]
  
    // 채팅방 생성
    let chattingRoom = await chattingRoomModel.create({
      readedMessageCountInfos: readedMessageCountInfos
    })
  
    let chattingRoomId = chattingRoom._id
    
    // 친구에 대한 상태로 승인으로 수정
    await userFriendsModel.findOneAndUpdate(
      {userObjectId: myObjectId, friendObjectId: friendObjectId},
      {
        status: "accept",
        chattingRoomId: chattingRoomId
      },
    )
    
    // 상대 친구의 나에 대한 상태 승인으로 수정
    await userFriendsModel.findOneAndUpdate(
      {userObjectId: friendObjectId, friendObjectId: myObjectId},
      {
        status: "accept",
        chattingRoomId: chattingRoomId
      }
    )

  }
  
}
