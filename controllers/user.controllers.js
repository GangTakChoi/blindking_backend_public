const jwt = require('jsonwebtoken')
const userModel = require('../model/user_model')
const boardModel = require('../model/board_model')
const boardCommentModel = require('../model/comment_model')
const userFriendsModel = require('../model/user_friends_model')
const chattingRoomModel = require('../model/chatting_room')
const areaModel = require('../model/area_model')
const commonModel = require('../model/common_model')
const questionListModel = require('../model/question_list_model')
const userReportModel = require('../model/user_report_model')
const mongoose = require('mongoose')

exports.addUser = async function (req, res, next) {
  try {
    const crypto = require('crypto')

    const userId = req.body.id
    const userPw = req.body.pw
    const userPwRepeat = req.body.pwRepeat
    const userNickname = req.body.nickname
    const userGender = req.body.gender

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

    const userInfo = {
      id: userId,
      pw: encryptedPassword,
      nickname: userNickname,
      gender: userGender,
      questionList: [],
      region: {}
    }

    await userModel.create(userInfo)

    res.status(201).json({ result: 'success' })
  } catch (e) {
    console.log(e)
    res.status(500).json({ errorMessage: 'server error' });
  }
};

exports.useMatchingTopDisplay = async (req, res, next) => {
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

exports.putActiveStatus = async (req, res, next) => {
  try {
    let reportedUserId = req.params.userId
    let myObjectId = res.locals.userObjectId
    let stopPrieod = req.body.stopPrieod
    let adminComment = req.body.content

    if (typeof stopPrieod !== 'string' || stopPrieod.length > 20) {
      res.status(400).json({ errorMessage: 'invalid request' })
      return
    }

    if (typeof adminComment !== 'string' || adminComment.length > 5000) {
      res.status(400).json({ errorMessage: 'content too long (5000자 이내)' })
      return
    }

    let myUserInfo = await userModel.findOne({ _id: myObjectId }, { roleName: 1 })

    if (!myUserInfo || myUserInfo.roleName !== 'admin') {
      res.status(400).json({ errorMessage: 'invalid request' })
      return
    }

    let activeStopPrieodLastDate = new Date()

    if (stopPrieod === '3일') {
      activeStopPrieodLastDate.setDate(activeStopPrieodLastDate.getDate() + 3)
    } else if (stopPrieod === '1주일') {
      activeStopPrieodLastDate.setDate(activeStopPrieodLastDate.getDate() + 7)
    } else if (stopPrieod === '1개월') {
      activeStopPrieodLastDate.setMonth(activeStopPrieodLastDate.getMonth() + 1)
    } else if (stopPrieod === '3개월') {
      activeStopPrieodLastDate.setMonth(activeStopPrieodLastDate.getMonth() + 3)
    } else if (stopPrieod === '6개월') {
      activeStopPrieodLastDate.setMonth(activeStopPrieodLastDate.getMonth() + 6)
    } else if (stopPrieod === '영구정지') {
      activeStopPrieodLastDate.setFullYear(activeStopPrieodLastDate.getFullYear() + 80)
    } else {
      res.status(400).json({ errorMessage: 'invalid request' })
      return
    }

    let userActiveStopHistoryInfo = {
      stopPrieod: stopPrieod,
      startDate: new Date(),
      endDate: activeStopPrieodLastDate,
      adminComment: adminComment,
    }

    await userModel.findOneAndUpdate(
      { _id: reportedUserId },
      { 
        $set: { activeStopPrieodLastDate: activeStopPrieodLastDate },
        $push: { activeStopHistoryList: userActiveStopHistoryInfo } 
      }
    )

    res.status(200).json({result: 'success'})
  } catch (error) {
    console.log(error)
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

    if (!userInfo) {
      res.status(400).json({ errorMessage: '로그인 실패' });
      return
    }
    
    // 활동 정지 여부 확인
    if (Date.now() < userInfo.activeStopPrieodLastDate.getTime()) {
      let dateInfo = userInfo.activeStopPrieodLastDate
      res.clearCookie('token');
      res.status(401).json({ 
        errorMessage: `신고처리된 회원입니다.\n[${dateInfo.getFullYear()}-${dateInfo.getMonth()+1}-${dateInfo.getDate()} ${dateInfo.getHours()}:${dateInfo.getMinutes()}]까지 정지기간 입니다.` 
      });
      return
    }

    const token = jwt.sign(
      {
        id: userInfo.id,
        objectId: userInfo._id,
        nickname: userInfo.nickname,
        roleName: userInfo.roleName,
        gender: userInfo.gender,
      },
      YOUR_SECRET_KEY,
      {expiresIn: '12h'}
    );

    res.cookie('token', token);
    res.cookie('gender', userInfo.gender);
    res.cookie('nickname', userInfo.nickname);
    res.cookie('matchingTopDisplayUseingTime', userInfo.matchingTopDisplayUseingTime.getTime());

    let resUserInfo = {
      isAdmin: userInfo.roleName === 'admin' ? true : false,
      isActiveMatching: userInfo.isActiveMatching,
    }
    
    res.status(201).json({
      result: 'ok',
      userInfo: resUserInfo,
    });
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

    reqUserQuestionList.forEach((questionInfo) => {
      if (typeof questionInfo.answer !== 'string') {
        res.status(400).json({ errorMessage: 'question answer type error' });
        return
      }
      if (questionInfo.answer.length > 5000) {
        res.status(400).json({ errorMessage: 'question answer too long' });
        return
      }

      userQuestionList.push({
        answer: questionInfo.answer,
        questionId: questionInfo.questionId,
      })

      questionIdList.push(questionInfo.questionId)
    })

    let resultCount = await questionListModel.countDocuments({ _id: { $in:  questionIdList} })

    if (questionIdList.length !== resultCount) {
      res.status(400).json({ errorMessage: 'invaild request' });
      return
    }

    // 질문 정보 저장
    userUpdateInfo.questionAnswerInfoList = userQuestionList
    
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

exports.getMypageInfo = async function (req, res, next) {
  try {
    let myObjectId = res.locals.userObjectId

    let boardSkip = Number(req.query.boardSkip)
    boardSkip = isNaN(boardSkip) ? 0 : boardSkip
    let boardSort = req.query.boardSort

    let commentSkip = Number(req.query.commentSkip)
    commentSkip = isNaN(commentSkip) ? 0 : commentSkip
    let commentSort = req.query.commentSort

    let typeList = req.query.type !== undefined ? req.query.type.split(',') : []
    let limit = 10

    let isLoadBoardInfo = typeList.includes('board')
    let isCommentInfo = typeList.includes('comment')

    let boardList = []
    let boardCommentList = []

    if (isLoadBoardInfo) {
      let boardSortInfo

      if (boardSort === 'latest') {
        boardSortInfo = { _id: -1 }
      } else if (boardSort === 'popular') {
        boardSortInfo = { like: -1, _id: -1 }
      } else if (boardSort === 'view') {
        boardSortInfo = { view: -1, _id: -1 }
      } else {
        boardSortInfo = { _id: -1 }
      }

      boardList = await boardModel.find(
        { 
          writerUserId: myObjectId,
          isDelete: false
        },
        { title:1, view:1, commentCount: 1, like: 1, dislike: 1, createdAt: 1 }
      )
      .skip(boardSkip)
      .limit(limit)
      .sort(boardSortInfo)
    }

    if (isCommentInfo) {
      let commentSortInfo

      if (commentSort === 'latest') {
        commentSortInfo = { _id: -1 }
      } else if (commentSort === 'popular') {
        commentSortInfo = { like: -1, _id: -1 }
      } else {
        commentSortInfo = { _id: -1 }
      }

      boardCommentList = await boardCommentModel.aggregate([
        { $match: { writerUserId: mongoose.Types.ObjectId(myObjectId), isDelete: false } },
        {
          $lookup:
          {
            from: "boards",
            let: { boardId: "$boardId" },
            pipeline: [
              { 
                $match: { 
                  $expr: { 
                    $and: [ { $eq: [ "$_id",  "$$boardId" ] } ]
                  }
                },
              },
              { $project: { title: 1 } }
            ],
            as: "boardInfo"
          }
        },
        { $sort: commentSortInfo },
        { $skip: commentSkip },
        { $limit: limit },
        { $project: { content: 1, boardId: 1, createdAt: 1, like: 1, boardInfo: 1 } },
      ])
    }

    res.status(200).json({
      result: 'success',
      boardList: boardList,
      commentList: boardCommentList,
    })
  } catch (err) {
    console.log(err)
    res.status(500).json({ errorMessage: 'server error' })
  }
}

exports.getSelfIntroduction = async function (req, res, next) {
  try {
    const userObjectId = res.locals.userObjectId

    let userInfo = await userModel.findOneBy_Id(userObjectId)

    if (!userInfo) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }

    let questionList = await questionListModel.find({ isShow: true, isDelete: false }, { order: 1, content: 1, inputType: 1 }).sort({order: 1})
    let upperArea = await areaModel.find({ depth:0 }, { _id: 0, createdAt: 0, updatedAt: 0 })
    let subArea = await areaModel.find({ depth:1 }, { _id: 0, createdAt: 0, updatedAt: 0 }).sort({ name: 1 })
    let mbtiInfo = await commonModel.findOne({ key:'mbti' })

    let response = {
      userInfo: {
        birthYear: userInfo.birthYear,
        mbti: userInfo.mbti,
        region: userInfo.region,
        questionAnswerInfoList : userInfo.questionAnswerInfoList ,
      },
      regionInfo: {
        upperArea: upperArea,
        subArea: subArea
      },
      questionList: questionList,
      mbtiList: mbtiInfo.data,
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
      { birthYear: 1, nickname: 1, gender:1, mbti: 1, questionAnswerInfoList : 1, region: 1 }
    )
    .sort({ matchingTopDisplayUseingTime : -1 })
    .skip(skip)
    .limit(limit)

    let response = {
      userList: userList,
    }

    if (isInitial) {
      let mbtiInfo = await commonModel.findOne({ key:'mbti' })
      let mbtiList = mbtiInfo.data
      let upperArea = await areaModel.find({ depth:0 }, { _id: 0, createdAt: 0, updatedAt: 0 })
      let subArea = await areaModel.find({ depth:1 }, { _id: 0, createdAt: 0, updatedAt: 0 }).sort({ name: 1 })
      let questionList = await questionListModel.find({ isShow: true, isDelete: false }, { content: 1 })
      .sort({ order: 1 })

      response.mbtiList = mbtiList
      response.regionInfo = {
        upperArea: upperArea,
        subArea: subArea,
      }
      response.questionList = questionList
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
    let userDetailInfo = await userModel.findOne(
      { _id: userObjectId }, 
      { birthYear:1, nickname:1, gender:1, mbti:1, questionAnswerInfoList :1, region:1 }
    )

    if (!userDetailInfo) {
      res.status(400).json({errorMessage: 'invalid request'})
    }

    let questionList = await questionListModel.find({ isShow: true, isDelete: false }, { content: 1 })
    .sort({ order: 1 })

    res.status(200).json({
      userDetailInfo: userDetailInfo,
      questionList: questionList,
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
    
    let friendInfoList = await userFriendsModel.find(filter)
    .populate('friendObjectId', {nickname: 1})
    .populate('chattingRoomId', {messageUnReadInfos: 1})
    .sort({"updatedAt": -1})

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
        let isUnReadMessage = false

        friendInfo.chattingRoomId.messageUnReadInfos.forEach((messageUnreadInfo) => {
          if (String(messageUnreadInfo.userObjectId) === userObjectId) {
            isUnReadMessage = messageUnreadInfo.isUnReadMessage
          }
        })

        tempfriendInfo.isUnReadMessage = isUnReadMessage

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

exports.reportUser = async function (req, res, next) {
  try {
    let myObjectId = res.locals.userObjectId
    let myNickname = res.locals.userNickname
    let reportedUserId = req.params.friendId
    let target = req.body.target
    let type = req.body.reportType
    let content = req.body.reportContent

    if (typeof target !== 'string' || target.length > 100) {
      res.status(400).json({ errorMessage: 'invalid request' })
      return
    }

    if (typeof type !== 'string' || target.length > 100) {
      res.status(400).json({ errorMessage: 'invalid request' })
      return
    }

    if (typeof content !== 'string' || content.length > 5000) {
      res.status(400).json({ errorMessage: '신고 내용이 너무 깁니다.' })
      return
    }

    let reportedUserInfo = await userModel.findOne({_id: reportedUserId}, {nickname: 1})

    if (!reportedUserInfo) {
      res.status(400).json({ errorMessage: '존재하지 않는 회원입니다.' })
      return
    }

    let reportInfo = {
      target: target,
      type: type,
      reporterUserId: myObjectId,
      reporterNickname: myNickname,
      reportedUserId: reportedUserId,
      reportedUserNickname: reportedUserInfo.nickname,
      reportContent: content,
      adminComment: '',
    }

    await userReportModel.createOrSave(reportInfo)

    res.status(200).json({ result: 'success' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ errorMessage: 'server error' })
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

exports.getReportList = async function (req, res, next) {
  try {
    let myObjectId = res.locals.userObjectId
    let skip = Number(req.query.skip)
    skip = isNaN(skip) ? 0 : skip
    let limit = Number(req.query.limit)
    limit = isNaN(limit) ? 30 : limit
    let reportType = req.query.reportType === undefined ? null : req.query.reportType
    let reportTarget = req.query.reportTarget === undefined ? null : req.query.reportTarget
    let reporterNickname = req.query.reporter === undefined ? null : req.query.reporter
    let reportedNickname = req.query.reported === undefined ? null : req.query.reported

    let userInfo = await userModel.findOne({ _id: myObjectId }, {roleName: 1})

    if (!userInfo || userInfo.roleName !== 'admin') {
      res.status(400).json({ errorMessage: 'invalid request' })
      return
    }

    let filter = {}

    if (reportType !== null) filter.type = reportType
    if (reportTarget !== null) filter.target = reportTarget
    if (reporterNickname !== null) filter.reporterNickname = reporterNickname
    if (reportedNickname !== null) filter.reportedUserNickname = reportedNickname

    let reportList = await userReportModel.find(filter)
    .skip(skip)
    .limit(limit)
    .sort({_id: -1})

    res.status(200).json({ reportList: reportList })
  } catch (error) {
    console.log(error)
    res.status(500).json({ errorMessage: 'server error' })
  }
}

exports.getReportDetail = async function (req, res, next) {
  try {
    let myObjectId = res.locals.userObjectId
    let reportId = req.params.reportId

    let userInfo = await userModel.findOne({ _id: myObjectId }, {roleName: 1})

    if (!userInfo || userInfo.roleName !== 'admin') {
      res.status(400).json({ errorMessage: 'invalid request' })
      return
    }

    let reportInfo = await userReportModel.findOne({ _id: reportId })

    res.status(200).json({ result: 'success', reportInfo: reportInfo })
  } catch (error) {
    console.log(error)
    res.status(500).json({ errorMessage: 'server error' })
  }
}

exports.getChattingInfo = async function (req, res, next) {
  try {
    let myObjectId = res.locals.userObjectId
    let userId = req.params.userId
    let friendObjectId = req.params.friendId

    let userInfo = await userModel.findOne({ _id: myObjectId}, {roleName: 1})

    if (!userInfo || userInfo.roleName !== 'admin') {
      res.status(400).json({ errorMessage: 'invalid request' })
      return
    }

    let userFriendInfo = await userFriendsModel.findOne({ userObjectId: userId, friendObjectId: friendObjectId })

    if (!userFriendInfo) {
      res.status(400).json({ errorMessage: '유효하지 않은 친구관계입니다.' })
      return
    }

    let chattingInfo = await chattingRoomModel.findOne({ _id: userFriendInfo.chattingRoomId },{ messageRecords: 1 })

    if (!chattingInfo) {
      res.status(400).json({ errorMessage: '채팅 정보가 존재하지 않습니다.'})
      return
    }

    res.status(200).json({ result: 'success', chattingList: chattingInfo.messageRecords})
  } catch (error) {
    console.log(error)
    res.status(500).json({ errorMessage: 'server error' })
  }
}

exports.getCommentListForOne = async function (req, res, next) {
  try {
    let myObjectId = res.locals.userObjectId
    let boardId = req.params.boardId
    let userId = req.params.userId

    let myUserInfo = await userModel.findOne({_id: myObjectId}, {roleName: 1})

    if (!myUserInfo || myUserInfo.roleName !== 'admin') {
      res.status(401).json({ errorMessage: 'unauthorized' })
      return
    }

    let commentList = await boardCommentModel.find({ boardId: boardId, writerUserId: userId })
    .sort({_id: -1})

    res.status(200).json({ result: 'success', commentList: commentList })
  } catch (error) {
    console.log(error)
    res.status(500).json({errorMessage: 'server error'})
  }
}

exports.getUserActivityStopHistory = async function (req, res, next) {
  try {
    let myObjectId = res.locals.userObjectId
    let userId = mongoose.Types.ObjectId(req.params.userId)

    let myUserInfo = await userModel.findOne({_id: myObjectId}, {roleName: 1})

    if (!myUserInfo || myUserInfo.roleName !== 'admin') {
      res.status(400).json({ errorMessage: 'invalid request' })
      return
    }

    let userInfo = await userModel.aggregate([
      {$match: { _id:userId }},
      {$unwind: '$activeStopHistoryList'},
      {$sort: {'activeStopHistoryList._id': -1}},
      {$group: {_id: '$_id', 'activeStopHsty': {$push: '$activeStopHistoryList'}}},
      {$project:{ activeStopHistoryList: '$activeStopHsty' }}
    ])

    let activeStopHistoryList = userInfo.length < 1 ? [] : userInfo[0].activeStopHistoryList

    res.status(200).json({ result: 'success', activeStopHistoryList: activeStopHistoryList })
  } catch (error) {
    console.log(error)
    res.status(500).json({ errorMessage: 'server error' })
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
    let messageUnReadInfos = [
      {
        userObjectId: myObjectId,
        isUnReadMessage: false
      },
      {
        userObjectId: friendObjectId,
        isUnReadMessage: false
      }
    ]
  
    // 채팅방 생성
    let chattingRoom = await chattingRoomModel.create({
      messageUnReadInfos: messageUnReadInfos,
      isClose: false
    })
  
    let chattingRoomId = chattingRoom._id
    
    // 친구에 대한 상태로 승인으로 수정
    await userFriendsModel.findOneAndUpdate(
      {
        userObjectId: myObjectId,
        friendObjectId: friendObjectId
      },
      {
        status: "accept",
        chattingRoomId: chattingRoomId
      },
    )
    
    // 상대 친구의 나에 대한 상태 승인으로 수정
    await userFriendsModel.findOneAndUpdate(
      {
        userObjectId: friendObjectId,
        friendObjectId: myObjectId
      },
      {
        status: "accept",
        chattingRoomId: chattingRoomId
      }
    )

  }
  
}
