const jwt = require('jsonwebtoken')
const userModel = require('../model/user_model')
const userFriendsModel = require('../model/user_friends_model')
const chattingRoomModel = require('../model/chatting_room')
const areaModel = require('../model/area_model')
const commonModel = require('../model/common_model')
const questionListModel = require('../model/question_list_model')

exports.addUser = async function (req, res, next) {
  try {
    const crypto = require('crypto')

    const userId = req.body.id
    const userPw = req.body.pw
    const userPwRepeat = req.body.pwRepeat
    const userNickname = req.body.nickname
    const userGender = req.body.gender
    const userQuestionList = []

    // 아이디 유효성 검사
    let idValiddation = /^[a-zA-Z0-9]*$/;

    if (!idValiddation.test(userId)) {
      res.status(400).json({ errorMessage: '아이디는 영문자+숫자로만 구성 할 수 있습니다.' });
      return
    }

    if (userId.length < 4 || userId.length > 26) {
      res.status(400).json({ errorMessage: '아이디는 4~26자로 제한됩니다.' });
      return
    }

    let tempResult = await userModel.findOne({id: userId}, {id: 1})

    if (tempResult !== null) {
      res.status(400).json({ errorMessage: '중복된 아이디입니다.' });
      return
    }

    // 비번 유효성 검사
    if (userPw.length < 6 || userPw.length > 36) {
      res.status(400).json({ errorMessage: '비밀번호 길이제한을 지켜주세요.' });
      return
    }

    if (userPw !== userPwRepeat) {
      res.status(400).json({ errorMessage: '비밀번호 재입력 값이 일치하지 않습니다.' });
      return
    }

    // 닉네임 유효성 검사
    if (userNickname.trim().length <= 0 || userNickname.length > 16) {
      res.status(400).json({ errorMessage: '닉네임 길이제한을 지켜주세요.' });
      return
    }

    tempResult = await userModel.findOne({nickname: userNickname}, {nickname: 1})

    if (tempResult !== null) {
      res.status(400).json({ errorMessage: '중복된 닉네임입니다.' });
      return
    }

    // 성별 유효성 검사
    if (userGender !== 'male' && userGender !== 'female') {
      res.status(400).json({ errorMessage: 'invalid request' });
      return
    }

    const encryptedPassword = await crypto.pbkdf2Sync(
      userPw, 
      process.env.CRYPTO_SALT, 
      Number(process.env.CRYPTO_REPETITION_NUMBER), 
      Number(process.env.CRYPTO_KEY_LEN), 
      process.env.CRYPTO_ALGORITHM,
    ).toString(process.env.CRYPTO_ENCODING)

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
      pw: encryptedPassword,
      nickname: userNickname,
      gender: userGender,
      questionList: userQuestionList,
      region: {}
    }

    await userModel.create(userInfo)

    res.status(201).json({ result: 'success' })
  } catch (e) {
    console.log(e)
    res.status(500).json({ errorMessage: 'server error' });
  }
};

exports.useTopDisplay = async (req, res, next) => {
  try {
    let userObjectId = res.locals.userObjectId

    let userInfo = await userModel.findOne(
      { _id:userObjectId },
      { matchingTopDisplayUseingTime: 1 }
    )

    const matchingTopDisplayUseingTime = userInfo.matchingTopDisplayUseingTime

    if (matchingTopDisplayUseingTime === null) {
      let updatedUserInfo = await userModel.findOneAndUpdate(
        { _id:userObjectId }, 
        { matchingTopDisplayUseingTime: Date.now() },
        { new: true }
      )
      
      res.cookie('matchingTopDisplayUseingTime', updatedUserInfo.matchingTopDisplayUseingTime.getTime());
      res.status(200).json({ matchingTopDisplayUseingTime: updatedUserInfo.matchingTopDisplayUseingTime })
      return
    }

    // 재사용 대기 시간 설정 (시간단위 값 설정)
    let reuseLatencyHours = 4

    const nowDateTime = Date.now()

    const timeDiffTime = nowDateTime - matchingTopDisplayUseingTime
    const fourHoursTime = 1000 * 60 * 60 * reuseLatencyHours

    if (timeDiffTime < fourHoursTime) {
      const displayTime = fourHoursTime - timeDiffTime

      const timeDiffMin = displayTime / 1000 / 60

      let displayDiffHour = Math.floor(displayTime / 1000 / 60 / 60)
      let displayDiffMin = Math.floor(timeDiffMin - (displayDiffHour * 60))
      let displayDiffSec = Math.floor(displayTime / 1000 - (Math.floor(timeDiffMin) * 60))

      displayDiffHour = '0' + displayDiffHour
      if (displayDiffMin < 10) displayDiffMin = '0' + displayDiffMin
      if (displayDiffSec < 10) displayDiffSec = '0' + displayDiffSec

      res.cookie('matchingTopDisplayUseingTime', matchingTopDisplayUseingTime.getTime());
      res.status(400).json({errorMessage: `재사용 대기시간이 ${displayDiffHour}시 ${displayDiffMin}분 ${displayDiffSec}초 남았습니다.`})
      return
    } else {
      let updatedUserInfo = await userModel.findOneAndUpdate(
        { _id:userObjectId }, 
        { matchingTopDisplayUseingTime: Date.now() },
        { new: true }
      )
      
      res.cookie('matchingTopDisplayUseingTime', updatedUserInfo.matchingTopDisplayUseingTime.getTime());
      res.status(200).json({ matchingTopDisplayUseingTime: updatedUserInfo.matchingTopDisplayUseingTime })
      return
    }

    
  } catch (e) {
    console.log(e)
    res.status(500).json({errorMessage: 'server error'})
  }
}

exports.activeMatching = async (req, res, next) => {
  try {
    let userObjectId = res.locals.userObjectId
    let isUseMatchingTopDisplay = false

    let userInfo = await userModel.findOne({ _id:userObjectId })

    let userUpdateInfo = {
      isActiveMatching: !userInfo.isActiveMatching
    }

    // 비활성화 -> 활성화로 전환하는 경우
    if (!userInfo.isActiveMatching) {
      // 필수 자기소개작성 목록 체크 및 유효성 검증
      if (userInfo.mbti === 'unkown' || !userInfo.birthYear || !userInfo.region || !userInfo.region.rootAreaCode || !userInfo.region.subAreaCode) {
        res.status(400).json({ errorMessage: '자기소개작성에서 MBTI, 출생년도, 지역을 설정하셔야\n매칭활성화가 가능합니다.' })
        return
      }

      let filter = {
        parentCode: userInfo.region.rootAreaCode,
        code: userInfo.region.subAreaCode
      }

      let result = await areaModel.findOne(filter)

      if (!result) {
        res.status(400).json({ errorMessage: '설정된 지역이 유효하지 않습니다.' })
        return
      }

      // 첫 매칭 활성화 시 상위 노출
      if (userInfo.matchingTopDisplayUseingTime.getTime() === 0) {
        isUseMatchingTopDisplay = true
        userUpdateInfo.matchingTopDisplayUseingTime = Date.now()
      }
    }

    let updatedUserInfo = await userModel.findOneAndUpdate(
      { _id:userObjectId }, 
      userUpdateInfo,
      { new: true }
    )

    res.cookie('isActiveMatching', updatedUserInfo.isActiveMatching);
    res.cookie('matchingTopDisplayUseingTime', updatedUserInfo.matchingTopDisplayUseingTime.getTime());
    res.status(200).json({ 
      result: 'success',
      isActiveMatching: updatedUserInfo.isActiveMatching,
      isUseMatchingTopDisplay: isUseMatchingTopDisplay,
    })
  } catch (e) {
    console.log(e)
    res.status(500).json({ errorMessage: 'server error' });
  }
}

exports.createToken = async function (req, res, next) {
  try {
    const crypto = require('crypto')

    const reqInfo = req.body
    const YOUR_SECRET_KEY = process.env.SECRET_KEY
    const userId = reqInfo.id
    const userPw = reqInfo.pw

    const encryptedUserPw = await crypto.pbkdf2Sync(
      userPw, 
      process.env.CRYPTO_SALT, 
      Number(process.env.CRYPTO_REPETITION_NUMBER), 
      Number(process.env.CRYPTO_KEY_LEN), 
      process.env.CRYPTO_ALGORITHM,
    ).toString(process.env.CRYPTO_ENCODING)

    const userInfo = await userModel.findOneByIdPw(userId, encryptedUserPw)

    if (userInfo !== null) {
      const token = jwt.sign(
        {
          id: userInfo.id,
          objectId: userInfo._id,
          nickname: userInfo.nickname,
        },
        YOUR_SECRET_KEY,
        {expiresIn: '6h'}
      );

      res.cookie('token', token);
      res.cookie('nickname', userInfo.nickname);
      res.cookie('isActiveMatching', userInfo.isActiveMatching);
      res.cookie('matchingTopDisplayUseingTime', userInfo.matchingTopDisplayUseingTime.getTime());
      
      res.status(201).json({
        result: 'ok'
      });
    } else {
      res.status(400).json({ errorMessage: '로그인 실패' });
    }
  } catch (err) {
    console.log(err)
    res.status(500).json({errorMessage: 'server error'})
  }
};

exports.setSelfIntroduction = async function (req, res, next) {
  try {
    const userObjectId = res.locals.userObjectId
    const userBirthYear = Number(req.body.birthYear)
    const userMBTI = req.body.mbti
    const reqUserQuestionList = req.body.questionList

    // 유저 정보
    let userUpdateInfo = {
      birthYear: userBirthYear,
      mbti: userMBTI,
      questionList: [],
      region: {}
    }

    // 질문 정보 유효성 검사
    if (!Array.isArray(reqUserQuestionList)) {
      res.status(400).json({ errorMessage: 'invaild request' });
      return
    }

    let questionIdList = []
    let userQuestionList = []
    let isInvalidRequest= false

    reqUserQuestionList.forEach((questionInfo) => {
      if (typeof questionInfo.answer !== 'string') {
        isInvalidRequest = true
      }
      if (questionInfo.answer.length > 5000) {
        isInvalidRequest = true
      }

      userQuestionList.push({
        answer: questionInfo.answer,
        questionId: questionInfo.questionId,
      })

      questionIdList.push(questionInfo.questionId)
    })

    if (isInvalidRequest) {
      res.status(400).json({ errorMessage: 'invaild request' });
      return
    }

    let resultCount = await questionListModel.countDocuments({ _id: { $in:  questionIdList} })

    if (questionIdList.length !== resultCount) {
      res.status(400).json({ errorMessage: 'invaild request' });
      return
    }

    // 질문 정보 저장
    userUpdateInfo.questionList = userQuestionList
    
    // 출생년도 유효성 검사
    let nowDate = new Date();
    const fullAgeBirthYear = nowDate.getFullYear() - 19;	// 올해 성년 출생년도

    if (isNaN(userBirthYear) || userBirthYear < 1900 || userBirthYear > fullAgeBirthYear) {
      res.status(400).json({ errorMessage: 'invaild request' });
      return
    }

    // mbti 유효성 검사
    let mbtiInfo = await commonModel.findOne({key:'mbti'})

    if (!mbtiInfo.data.includes(userMBTI)) {
      res.status(400).json({ errorMessage: 'invaild request' });
      return
    }

    // 지역 정보
    if (req.body.rootAreaCode !== undefined && req.body.subAreaCode !== undefined) {
      let rootAreaCode = req.body.rootAreaCode
      let subAreaCode = req.body.subAreaCode

      let filter = {
        $or: [{code: subAreaCode},{code: rootAreaCode}]
      }

      let areaInfoList = await areaModel.find(filter)

      // 지역 코드 유효성 검사
      if (!areaInfoList || !Array.isArray(areaInfoList) || areaInfoList.length !== 2) {
        res.status(400).json({ errorMessage: 'invaild request' });
        return
      }

      areaInfoList.forEach((areaInfo) => {
        if (areaInfo.depth === 0) {
          userUpdateInfo.region.rootAreaCode = areaInfo.code
          userUpdateInfo.region.rootAreaName = areaInfo.name
        }
        if (areaInfo.depth === 1) {
          userUpdateInfo.region.subAreaCode = areaInfo.code
          userUpdateInfo.region.subAreaName = areaInfo.name
        }
      })
    }
    
    // 유저 정보 업데이트
    await userModel.findOneAndUpdate({_id: userObjectId}, userUpdateInfo)

    res.status(200).json({ result: 'success' });
  } catch (e) {
    console.log(e)
    res.status(500).json({ errorMessage: 'server error' });
  }
};

exports.getUserInfo = async function (req, res, next) {
  try {
    const userObjectId = res.locals.userObjectId

    let userInfo = await userModel.findOneBy_Id(userObjectId).populate('questionList.questionId', { updatedAt: 0, createdAt: 0 })

    if (!userInfo) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }

    let upperArea = await areaModel.find({ depth:0 }, { _id: 0, createdAt: 0, updatedAt: 0 })
    let subArea = await areaModel.find({ depth:1 }, { _id: 0, createdAt: 0, updatedAt: 0 }).sort({ name: 1 })
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
    let skip = req.query.skip === undefined ? 0 : Number(req.query.skip)
    if (isNaN(skip)) skip = 0
    let limit = req.query.limit === undefined ? 30 : Number(req.query.limit)
    if (isNaN(limit)) limit = 30

    // 요청 파라미터
    let isInitial = req.query.isInitial === 'true' ? true : false
    
    let searchAgeRange = {
      min: Number(req.query.ageMin),
      max: Number(req.query.ageMax)
    }

    let searchMbtiList = []
    if (typeof req.query.mbtiList === 'string' && req.query.mbtiList.length > 0) {
      searchMbtiList = req.query.mbtiList.split(',')
    }

    let searchUpperAreaCodeList = []
    if (typeof req.query.upperAreaCodeList === 'string' && req.query.upperAreaCodeList.length > 0) {
      searchUpperAreaCodeList = req.query.upperAreaCodeList.split(',')
    }

    let searchSubAreaCode = []
    if (typeof req.query.subAreaCodeList === 'string' && req.query.subAreaCodeList.length > 0) {
      searchSubAreaCode = req.query.subAreaCodeList.split(',')
    }

    // 필터
    let userListfilter = {
      gender: userGender === 'male' ? 'female' : 'male',
      isActiveMatching: true
    }

    // 연령대 필터
    if (!isNaN(searchAgeRange.max) || !isNaN(searchAgeRange.min)) {
      userListfilter['birthYear'] = {
        $gte: isNaN(searchAgeRange.max) ? 1900 : searchAgeRange.max,
        $lte: isNaN(searchAgeRange.min) ? 9999 : searchAgeRange.min
      }
    }

    // mbti 필터
    if (searchMbtiList.length > 0) {
      userListfilter['mbti'] = { $in: searchMbtiList }
    }

    // 상위 지역 필터
    if (searchUpperAreaCodeList.length > 0) {
      userListfilter['region.rootAreaCode'] = { $in: searchUpperAreaCodeList }
    }

    // 하위 지역 필터
    if (searchSubAreaCode.length > 0) {
      userListfilter['region.subAreaCode'] = { $in: searchSubAreaCode }
    }

    let userList = await userModel
    .find(
      userListfilter,
      { birthYear:1, nickname:1,gender:1,mbti:1,questionList:1,region:1 }
    )
    .populate('questionList.questionId', { updatedAt: 0, createdAt: 0 })
    .sort({ matchingTopDisplayUseingTime : -1 })
    .skip(skip)
    .limit(limit)

    let response = {
      userList: userList,
    }

    if (isInitial) {
      let mbtiInfo = await commonModel.findOne({ key:'mbti' })
      let mbtiList = mbtiInfo.data.filter((element) => element !== 'unkown');
      let upperArea = await areaModel.find({ depth:0 }, { _id: 0, createdAt: 0, updatedAt: 0 })
      let subArea = await areaModel.find({ depth:1 }, { _id: 0, createdAt: 0, updatedAt: 0 }).sort({ name: 1 })

      response.mbtiList = mbtiList
      response.regionInfo = {
        upperArea: upperArea,
        subArea: subArea,
      }
    }

    res.status(200).json(response)
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

exports.checkDuplicateId = async function (req, res, next) {
  try {
    let checkingId = req.params.id

    let userInfo = await userModel.findOne(
      { id: checkingId },
      { id: 1 }
    )

    let isCanUse = (userInfo === null) ? true : false

    res.status(200).json({isCanUse: isCanUse})
  } catch (error) {
    res.status(500).json({errorMessage: "server error"})
    console.log(error)
  }
}

exports.checkDuplicateNickname = async function (req, res, next) {
  try {
    let checkingNickname = req.params.nickname

    let userInfo = await userModel.findOne(
      { nickname: checkingNickname },
      { nickname: 1 }
    )

    let isCanUse = (userInfo === null) ? true : false

    res.status(200).json({isCanUse: isCanUse})
  } catch (error) {
    res.status(500).json({errorMessage: "server error"})
    console.log(error)
  }
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
