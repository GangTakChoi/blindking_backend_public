const boardModel = require('../model/board_model')
const boardLikeModel = require('../model/board_like_model')
const boardCommentModel = require('../model/comment_model')
const commentLikeModel = require('../model/comment_like_model')
const categoryModel = require('../model/board_category_model')
const userModel = require('../model/user_model')
const userReportModel = require('../model/user_report_model')
const createError = require('http-errors');

exports.getBoardList = async (req, res, next) => {
  try {
    let filter = {
      $and: [{isDelete: false},{isShow: true}],
    }

    let currentPage = Number(req.query.page)
    let countPerPage = Number(req.query.countPerPage)
    let searchOption = req.query.searchOption
    let searchContent = req.query.searchContent
    let categoryId = req.query.categoryId

    // https://ip99202.github.io/posts/nodejs,-mongodb-%EA%B2%8C%EC%8B%9C%ED%8C%90-%EA%B2%80%EC%83%89-%EA%B8%B0%EB%8A%A5/
    // 참고

    if (searchOption !== undefined && searchContent !== undefined) {

      if (searchOption === 'title') {
        filter.$or = [{title: new RegExp(searchContent)}]
      } else if (searchOption === 'content') {
        filter.$or = [{searchContent: new RegExp(searchContent)}]
      } else if (searchOption === 'title+content') {
        filter.$or = [{title: new RegExp(searchContent)}, {searchContent: new RegExp(searchContent)}]
      } else if (searchOption === 'nickname') {
        filter.$or = [{nickname: new RegExp(searchContent)}]
      } else {
        next(createError(400, 'bad request'))
        return
      }
    }

    if (!categoryId) {
      let categoryInfo = await categoryModel.find({},{_id: 1}).limit(1)
      if (categoryInfo.length > 0)  categoryId = categoryInfo[0]._id
      else categoryId = null
    }

    filter.$and.push({ categoryId: categoryId })

    let boardList = await boardModel
    .find(filter)
    .sort({ _id: -1 })
    .skip(( currentPage - 1 ) * countPerPage)
    .limit(countPerPage)

    let totalBoardCount = await boardModel.countDocuments(filter)

    let lastPageNumber = Math.ceil(totalBoardCount / countPerPage)

    let responseData = []

    boardList.forEach((boardInfo) => {
      let tempBoardInfo = {
        Objectid: boardInfo._id,
        nickname: boardInfo.nickname,
        title: boardInfo.title,
        view: boardInfo.view,
        like: boardInfo.like,
        dislike: boardInfo.dislike,
        createdAt: boardInfo.createdAt,
        commentCount: boardInfo.commentCount,
      }

      responseData.push(tempBoardInfo)
    })
  
    res.status(200).json({
      boardList: responseData,
      lastPageNumber: lastPageNumber,
      categoryId: categoryId
    })
  } catch (err) {
    console.log(err)
    next(createError(500, 'server error'))
  }
}

exports.fileupload = async function(req, res, nest) {
  var fileUpload = require('../middlewares/s3Upload.js')
  var imgUpload = fileUpload.single('upload')

  imgUpload(req, res, function (err) {
    if (err) {
      let errorMessage = err.message

      if (err.code === 'LIMIT_FILE_SIZE') {
        errorMessage = '파일 사이즈가 너무 큽니다. (1.5MB 제한)'
      }

      console.log('이미지 업로드 실패')
      
      // CKEditor5 Error 형식에 맞게 데이터 전달
      res.status(500).json({ "error": { "message": errorMessage } });
      return
    }

    res.status(200).json({ "url": req.file.location });
  })
}

exports.deleteComment = async (req, res, next) => {
  try {
    let boardId = req.params.boardId
    let commentId = req.params.commentId
    let myObjectId = res.locals.userObjectId

    let commentInfo = await boardCommentModel.findOne({_id: commentId, writerUserId: myObjectId, isDelete: false}, { rootCommentId: 1, subCommentCount: 1 })

    // 유효성 검사
    if (!commentInfo) {
      next(createError(400, 'invalid request'))
      return
    }

    // 댓글 삭제 처리
    await boardCommentModel.findOneAndUpdate(
      {_id: commentId},
      {isDelete: true},
    )

    let rootCommentId = commentInfo.rootCommentId
    let isSubComment = rootCommentId !== null ? true : false

    if (isSubComment) {
      await boardCommentModel.findOneAndUpdate(
        {_id: rootCommentId},
        { '$inc': { 'subCommentCount': -1 }},
      )
    }

    if (!isSubComment && commentInfo.subCommentCount > 0) {
      await boardCommentModel.updateMany({rootCommentId: commentId}, {$set: { isDelete: true }})
    }

    let filter = {
      boardId: boardId,
      isDelete: false
    }

    // 해당 게시물 댓글 수 갱신
    let commentCount = await boardCommentModel.countDocuments(filter)

    await boardModel.findOneAndUpdate(
      {_id: boardId},
      {commentCount: commentCount},
    )

    res.status(200).json({
      result: 'success',
      isSubComment: isSubComment,
      rootCommentId: rootCommentId
    });
  } catch (e) {
    console.log(e)
    next(createError(500, 'server error'))
  }
}

exports.getCategory = async (req, res, next) => {
  try {
    let categoryList = await categoryModel.find({isDelete: false}, {type: 1, name: 1})

    let normalCategory = []
    let adminCategory = []

    categoryList.forEach((categoryInfo) => {
      if (categoryInfo.type === 'admin') adminCategory.push(categoryInfo)
      if (categoryInfo.type === 'normal') normalCategory.push(categoryInfo)
    })

    res.status(200).json({ normalCategory: normalCategory, adminCategory: adminCategory })
  } catch (error) {
    console.log(error)
    next(createError(500, 'server error'))
  }
}

exports.deleteCategory = async (req, res, next) => {
  try {
    let myObjectId = res.locals.userObjectId
    let categoryId = req.params.categoryId

    let userInfo = await userModel.findOne({_id: myObjectId}, {roleName: 1})

    if (userInfo.roleName !== 'admin') {
      next(createError(400, 'invalid request'))
      return
    }

    await categoryModel.findOneAndUpdate({ _id: categoryId }, { isDelete: true })

    res.status(200).json({ result: 'success' })
  } catch (error) {
    console.log(error)
    next(createError(500, 'server error'))
  }
}

exports.putCategoy = async (req, res, next) => {
  try {
    let myObjectId = res.locals.userObjectId
    let categoryId = req.params.categoryId
    let categoryName = req.body.categoryName

    if (categoryName.trim() === '') {
      next(createError(400, 'invalid request'))
      return
    }

    let userInfo = await userModel.findOne({ _id: myObjectId }, { roleName: 1 })

    if (userInfo.roleName !== 'admin') {
      next(createError(400, 'invalid request'))
      return
    }

    let categoryInfo = await categoryModel.findOne({ _id: categoryId })

    if (!categoryInfo) {
      next(createError(400, '카테고리가 존재하지 않습니다.'))
      return
    }

    let dupuliCheckCategoryInfo = await categoryModel.findOne({ name: categoryName }, {isDelete: 1})

    if (dupuliCheckCategoryInfo) {
      let errorMessage
      if (dupuliCheckCategoryInfo.isDelete) {
        errorMessage = '삭제된 카테고리 중에 중복된 카테고리 명이 존재합니다.'
      } else {
        errorMessage = '존재하는 카테고리 중에 중복된 카테고리 명이 존재합니다.'
      }
      next(createError(400, errorMessage))
      return
    }

    let savedCategoryInfo = await categoryModel.findOneAndUpdate({ _id: categoryId }, { name: categoryName }, { new: true })

    res.status(200).json({ result: 'success', categoryName: savedCategoryInfo.name })
  } catch (error) {
    console.log(error)
    next(createError(500, 'server error'))
  }
}

exports.addCategory = async (req, res, next) => {
  try {
    let categoryType = req.body.type 
    let categoryName = req.body.categoryName
    let myObjectId = res.locals.userObjectId

    let userInfo = await userModel.findOne({ _id: myObjectId }, { roleName: 1 })

    if (userInfo.roleName !== 'admin') {
      next(createError(400, 'invalid request'))
      return
    }

    if (!categoryType || !categoryName || categoryName.trim() === '' || categoryType.trim() === '') {
      next(createError(400, 'invalid request'))
      return
    }

    let dupuliCheckCategoryInfo = await categoryModel.findOne({ name: categoryName }, {isDelete: 1})

    if (dupuliCheckCategoryInfo) {
      let errorMessage
      if (dupuliCheckCategoryInfo.isDelete) {
        errorMessage = '삭제된 카테고리 중에 중복된 카테고리 명이 존재합니다.'
      } else {
        errorMessage = '존재하는 카테고리 중에 중복된 카테고리 명이 존재합니다.'
      }
      next(createError(400, errorMessage))
      return
    }

    let categoryInfo = {
      type: categoryType,
      name: categoryName,
    }

    await categoryModel.createOrSave(categoryInfo)

    res.status(200).json({ result: 'success' })
  } catch (error) {
    console.log(error)
    next(createError(500, 'server error'))
  }
}

exports.reportBoard = async (req, res, next) => {
  try {
    let myObjectId = res.locals.userObjectId
    let myNickname = res.locals.userNickname
    let boardId = req.params.boardId
    let target = req.body.target
    let type = req.body.reportType
    let content = req.body.reportContent

    if (typeof target !== 'string' || target.length > 100) {
      next(createError(400, 'invalid request'))
      return
    }

    if (typeof type !== 'string' || target.length > 100) {
      next(createError(400, 'invalid request'))
      return
    }

    if (typeof content !== 'string' || content.length > 5000) {
      next(createError(400, '신고 내용이 너무 깁니다.'))
      return
    }

    let boardInfo = await boardModel.findOne({_id: boardId})
    
    if (!boardInfo) {
      next(createError(400, 'invalid request'))
      return
    }

    let reportInfo = {
      target: target,
      type: type,
      reporterUserId: myObjectId,
      reporterNickname: myNickname,
      reportedUserId: boardInfo.writerUserId,
      reportedUserNickname: boardInfo.nickname,
      reportContent: content,
      captureTargetContent: boardInfo,
      adminComment: '',
    }

    await userReportModel.createOrSave(reportInfo)

    res.status(200).json({ result: 'success' })
  } catch (error) {
    console.log(error)
    next(createError(500, 'server error'))
  }
}

exports.reportComment = async (req, res, next) => {
  try {
    let myObjectId = res.locals.userObjectId
    let myNickname = res.locals.userNickname
    let boardId = req.params.boardId
    let commentId = req.params.commentId
    let target = req.body.target
    let type = req.body.reportType
    let content = req.body.reportContent

    if (typeof target !== 'string' || target.length > 100) {
      next(createError(400, 'invalid request'))
      return
    }

    if (typeof type !== 'string' || target.length > 100) {
      next(createError(400, 'invalid request'))
      return
    }

    if (typeof content !== 'string' || content.length > 5000) {
      next(createError(400, '신고 내용이 너무 깁니다.'))
      return
    }

    let commentInfo = await boardCommentModel.findOne({_id: commentId, boardId: boardId})

    if (!commentInfo) {
      next(createError(400, 'invalid request'))
      return
    }

    let reportInfo = {
      target: target,
      type: type,
      reporterUserId: myObjectId,
      reporterNickname: myNickname,
      reportedUserId: commentInfo.writerUserId,
      reportedUserNickname: commentInfo.nickname,
      reportContent: content,
      captureTargetContent: commentInfo,
      adminComment: '',
    }

    await userReportModel.createOrSave(reportInfo)

    res.status(200).json({ result: 'success' })
  } catch (error) {
    console.log(error)
    next(createError(500, 'server error'))
  }
}

exports.registSubComment = async (req, res, next) => {
  try {
    let boardId = req.params.boardId
    let rootCommentId = req.params.commentId
    let nickname = res.locals.userNickname
    let gender = res.locals.gender
    let userId = res.locals.userObjectId

    if (!req.body.content || typeof req.body.content !== 'string' || req.body.content.length > 5000) {
      next(createError(400, 'invalid request'))
      return
    }

    let rootCommentInfo = await boardCommentModel.findOne({ _id: rootCommentId, rootCommentId: null, boardId: boardId, isDelete: false })

    if (!rootCommentInfo) {
      next(createError(400, '삭제된 댓글입니다.'))
      return
    }

    let subCommentInfo = {
      rootCommentId: rootCommentId,
      gender: gender,
      writerUserId: userId,
      nickname: nickname,
      boardId: boardId,
      content: req.body.content,
      isDelete: false,
    }

    let savedCommentInfo = await boardCommentModel.createOrSave(subCommentInfo)

    let filter = {
      boardId: boardId,
      isDelete: false
    }

    // 게시판 댓글 갯수 갱신
    let commentCount = await boardCommentModel.countDocuments(filter)

    await boardModel.findOneAndUpdate(
      {_id: boardId},
      {commentCount: commentCount},
    )

    // 댓글의 대댓글 갯수 갱신
    filter = {
      rootCommentId: rootCommentId,
      isDelete: false,
    }

    let subCommentCount = await boardCommentModel.countDocuments(filter)

    await boardCommentModel.findOneAndUpdate(
      { _id: rootCommentId },
      { subCommentCount: subCommentCount }
    )

    let commentInfo = {
      objectId: savedCommentInfo._id,
      isMine: true,
      nickname: nickname,
      createdDate: savedCommentInfo.createdAt,
      content: savedCommentInfo.content,
      like: savedCommentInfo.like,
      evaluation: 'none',
    }

    res.status(200).json({
      result: 'success',
      commentInfo: commentInfo,
    });

  } catch (error) {
    console.log(error)
    next(createError(500, 'server error'))
  }
}

exports.getSubComment = async (req, res, next) => {
  try {
    let myObjectId = res.locals.userObjectId
    let boardId = req.params.boardId
    let rootCommentId = req.params.rootCommentId

    // 루트 댓글 유효성 검사
    let rootCommentInfo = await boardCommentModel.findOne({ _id: rootCommentId, rootCommentId: null, isDelete: false }, { _id: 1 })

    if (!rootCommentInfo) {
      next(createError(400, 'invalid request'))
      return
    }

    let rawSubCommentList = await boardCommentModel.find({ rootCommentId: rootCommentId, isDelete: false })
    .sort({_id: 1})

    let subCommentList = []

    rawSubCommentList.forEach((subCommentInfo) => {
      let tempSubCommentInfo = {
        objectId: String(subCommentInfo._id),
        isMine:  String(subCommentInfo.writerUserId) === myObjectId ? true : false,
        nickname: subCommentInfo.nickname,
        content: subCommentInfo.content,
        like: subCommentInfo.like,
        subCommentCount: subCommentInfo.subCommentCount,
        createdDate: subCommentInfo.createdAt,
        evaluation: 'none'
      }

      subCommentList.push(tempSubCommentInfo)
    })

    

    res.status(200).json({ result: 'success', subCommentList: subCommentList })
  } catch (error) {
    console.log(error)
    next(createError(500, 'server error'))
  }
}

exports.writeBoardOfComment = async (req, res, next) => {
  try {
    let userId = res.locals.userObjectId
    let boardId = req.params.id
    let nickname = res.locals.userNickname
    let gender = res.locals.gender

    if (!req.body.content || typeof req.body.content !== 'string' || req.body.content.length > 5000) {
      next(createError(400, 'invalid request'))
      return
    }

    let boardResult = await boardModel.findOne({ _id: boardId, isDelete: false }, { _id: 1 })
    
    // 해당 게시판 유효성 검사
    if (!boardResult) {
      next(createError(400, 'invalid request'))
      return
    }

    let boardCommentInfo = {
      rootCommentId: null,
      writerUserId: userId,
      gender: gender,
      nickname: nickname,
      boardId: boardId,
      content: req.body.content,
      isDelete: false,
    }

    let savedCommentInfo = await boardCommentModel.createOrSave(boardCommentInfo)

    let filter = {
      boardId: boardId,
      isDelete: false
    }

    let commentCount = await boardCommentModel.countDocuments(filter)

    await boardModel.findOneAndUpdate(
      {_id: boardId},
      {commentCount: commentCount},
    )

    let commentInfo = {
      objectId: savedCommentInfo._id,
      isMine: true,
      nickname: nickname,
      createdDate: savedCommentInfo.createdAt,
      content: savedCommentInfo.content,
      like: savedCommentInfo.like,
      evaluation: 'none',
    }

    res.status(200).json({
      result: 'success',
      commentInfo: commentInfo,
    });
  } catch (err) {
    console.log(err)
    next(createError(500, 'server error'))
  }
}

exports.deleteBoard = async (req, res, next) => {
  try {
    let boardId = req.params.boardId
    let myObjectId = res.locals.userObjectId

    let boardInfo = await boardModel.findOne(
      { _id: boardId, isDelete: false },
      { _id: 1, writerUserId: 1 }
    )

    if (!boardInfo) {
      next(createError(400, 'invalid request'))
      return
    }

    if (myObjectId !== String(boardInfo.writerUserId)) {
      let userInfo = await userModel.findOne({ _id: myObjectId }, {roleName: 1})

      if (userInfo.roleName !== 'admin') {
        next(createError(400, 'invalid request'))
        return
      }
    }

    await boardModel.findOneAndUpdate(
      { _id: boardInfo._id },
      { isDelete: true }
    )

    res.status(200).json({ result: 'success' })
  } catch (error) {
    console.log(error)
    next(createError(500, 'server error'))
  }
}

exports.modifyBoard = async (req, res, next) => {
  try {
    if (!req.body.title.trim()) {
      next(createError(400, '제목을 입력해주세요.'))
      return
    }

    if (req.body.title.length > 100) {
      next(createError(400, '제목은 100자 이내로 입력 가능합니다.'))
      return
    }

    if (!req.body.content.trim()) {
      next(createError(400, '내용을 입력해주세요.'))
      return
    }

    if (!req.body.content.length > 50000) {
      next(createError(400, '내용이 너무 깁니다.'))
      return
    }

    let boardId = req.params.id
    let myObjectId = res.locals.userObjectId

    let boardInfo = await boardModel.findOne(
      {
        _id: boardId, 
        writerUserId: myObjectId,
        isDelete: false,
      }
    )

    if (!boardInfo) {
      next(createError(400, 'invalid request'))
      return
    }

    await boardModel.findOneAndUpdate(
     {_id: boardId},
     {
      title: req.body.title,
      content: req.body.content,
      searchContent: req.body.content
      .replace(/(<([^>]+)>)/ig," ")
      .replace(/&lt;/ig, "<")
      .replace(/&gt;/ig, ">")
      .replace(/&amp;/ig, "&")
      .replace(/&nbsp;/ig, " ")
     }
    )

    res.status(200).json({ result: 'success' });
  } catch (err) {
    console.log(err)
    next(createError(500, 'server error'))
  }
}

exports.getBoardComment = async (req, res, next) => {
  try {
    let boardId = req.params.boardId
    let order = req.query.order
    let myObjectId = res.locals.userObjectId

    // 게시글 유효성 검사
    let boardInfo = await boardModel.findOne({ _id: boardId, isDelete: false }, { _id: 1 })

    if (!boardInfo) {
      next(createError(400, 'invalid request'))
      return
    }

    let sortInfo

    if (order === 'latest') {
      sortInfo = { _id: -1 }
    } else if (order === 'popular') {
      sortInfo = { like: -1, _id: -1 }
    } else {
      sortInfo = { _id: -1 }
    }

    // 댓글 조회
    let rawBoardCommentList = await boardCommentModel.find({ rootCommentId: null, boardId: boardId, isDelete: false })
    .sort(sortInfo)

    // 댓글 좋아요, 싫어요 정보 조회
    let commentEvaluatInfoList = await commentLikeModel.find({ userId: myObjectId, boardId: boardId })

    let boardCommentInfoList = []

    rawBoardCommentList.forEach((commentInfo) => {

      const thisCommentEvaluatInfo = commentEvaluatInfoList.find((commentEvaluatInfo) => {
        if (String(commentEvaluatInfo.commentId) === String(commentInfo._id)) return true
      })

      let commentInfoTemp = {
        objectId: String(commentInfo._id),
        isMine:  String(commentInfo.writerUserId) === myObjectId ? true : false,
        nickname: commentInfo.nickname,
        content: commentInfo.content,
        like: commentInfo.like,
        subCommentCount: commentInfo.subCommentCount,
        createdDate: commentInfo.createdAt,
        evaluation: thisCommentEvaluatInfo === undefined ? 'none' : thisCommentEvaluatInfo.evaluation
      }

      boardCommentInfoList.push(commentInfoTemp)
    })

    let response = {
      commentList: boardCommentInfoList
    }

    res.status(200).json(response)
  } catch (error) {
    console.log(error)
    next(createError(500, 'server error'))
  }
}

exports.writeBoard = async (req, res, next) => {
  try {
    if (!req.body.title.trim()) {
      next(createError(400, '제목을 입력해주세요.'))
      return
    }

    if (req.body.title.length > 100) {
      next(createError(400, '제목은 100자 이내로 입력 가능합니다.'))
      return
    }

    if (!req.body.content.trim()) {
      next(createError(400, '내용을 입력해주세요.'))
      return
    }

    if (!req.body.content.length > 50000) {
      next(createError(400, '내용이 너무 깁니다.'))
      return
    }

    if (!req.body.categoryId) {
      next(createError(400, 'invalid category id'))
      return
    }

    let categoryInfo = await categoryModel.findOne({_id: req.body.categoryId, isDelete: false}, {_id: 1, type: 1})

    if (!categoryInfo) {
      next(createError(400, 'invalid category id'))
      return
    }

    if (categoryInfo.type === 'admin') {
      let userInfo = await userModel.findOne({_id: res.locals.userObjectId}, {roleName: 1})
      if (userInfo.roleName !== 'admin') {
        next(createError(400, '권한 없음'))
        return
      }
    }

    let boardInfo = {
      writerUserId: res.locals.userObjectId,
      nickname: res.locals.userNickname,
      gender: res.locals.gender,
      title: req.body.title,
      content: req.body.content,
      searchContent: req.body.content
      .replace(/(<([^>]+)>)/ig," ")
      .replace(/&lt;/ig, "<")
      .replace(/&gt;/ig, ">")
      .replace(/&amp;/ig, "&")
      .replace(/&nbsp;/ig, " ")
      ,
      view: 0,
      like: 0,
      dislike: 0,
      isDelete: false,
      isShow: true,
      categoryId: req.body.categoryId,
    }
  
    await boardModel.createOrSave(boardInfo)
  
    res.status(200).json({ result: 'success' });
  } catch (err) {
    console.log(err)
    next(createError(500, 'server error'))
  }
}

exports.putCommentLike = async (req, res, next) => {
  try {
    let myObjectId = res.locals.userObjectId
    let boardId = req.params.boardId
    let commentId = req.params.commentId
    let status = req.body.status

    if (status !== 'like' && status !== 'dislike') {
      next(createError(400, 'invalid requset'))
      return
    }

    // boardId, commentId 유효성 검사 패스

    
    let updatedCommentInfo
    let updatedCommentLikeInfo
    let commentLikeFilter = { userId: myObjectId, commentId: commentId }
    let commentLikeInfo = await commentLikeModel.findOne(commentLikeFilter)

    if (!commentLikeInfo) {
      let saveCommentLikeInfo = {
        userId: myObjectId,
        boardId: boardId,
        commentId: commentId,
        evaluation: status,
      }

      let tempUpdatedCommentInfo = await commentLikeModel.createOrSave(saveCommentLikeInfo)

      updatedCommentLikeInfo = {
        commentId: tempUpdatedCommentInfo.commentId,
        evaluation: tempUpdatedCommentInfo.evaluation,
        _id: tempUpdatedCommentInfo._id
      }

      let incData = {}

      if (status === 'like') incData.like = 1
      else incData.dislike = 1

      updatedCommentInfo = await boardCommentModel.findOneAndUpdate(
        { _id: commentId } ,
        { '$inc': incData },
        { fields: { like: 1, dislike: 1 }, new: true }
      )
    } else {
      if (status === 'like') {
        if (commentLikeInfo.evaluation === 'like') {
          updatedCommentLikeInfo = await commentLikeModel.findOneAndUpdate(
            commentLikeFilter,
            { evaluation: 'none' },
            { fields: { commentId: 1, evaluation: 1 }, new: true }
          )

          updatedCommentInfo = await boardCommentModel.findOneAndUpdate(
            { _id: commentId },
            { '$inc': { 'like': -1 }},
            { fields: { like: 1, dislike: 1 }, new: true }
          )
        } else if (commentLikeInfo.evaluation === 'dislike') {
          updatedCommentLikeInfo = await commentLikeModel.findOneAndUpdate(
            commentLikeFilter,
            { evaluation: 'like' },
            { fields: { commentId: 1, evaluation: 1 }, new: true }
          )

          updatedCommentInfo = await boardCommentModel.findOneAndUpdate(
            { _id: commentId },
            { '$inc': { 'like': 1, 'dislike': -1 }},
            { fields: { like: 1, dislike: 1 }, new: true }
          )
        } else if (commentLikeInfo.evaluation === 'none') {
          updatedCommentLikeInfo = await commentLikeModel.findOneAndUpdate(
            commentLikeFilter,
            { evaluation: 'like' },
            { fields: { commentId: 1, evaluation: 1 }, new: true }
          )

          updatedCommentInfo = await boardCommentModel.findOneAndUpdate(
            { _id: commentId },
            { '$inc': { 'like': 1 }},
            { fields: { like: 1, dislike: 1 }, new: true }
          )
        }
      } else if (status === 'dislike') {
        if (commentLikeInfo.evaluation === 'like') {
          updatedCommentLikeInfo = await commentLikeModel.findOneAndUpdate(
            commentLikeFilter,
            { evaluation: 'dislike' },
            { fields: { commentId: 1, evaluation: 1 }, new: true }
          )

          updatedCommentInfo = await boardCommentModel.findOneAndUpdate(
            { _id: commentId },
            { '$inc': { 'like': -1, 'dislike': 1 }},
            { fields: { like: 1, dislike: 1 }, new: true }
          )
        } else if (commentLikeInfo.evaluation === 'dislike') {
          updatedCommentLikeInfo = await commentLikeModel.findOneAndUpdate(
            commentLikeFilter,
            { evaluation: 'none' },
            { fields: { commentId: 1, evaluation: 1 }, new: true }
          )

          updatedCommentInfo = await boardCommentModel.findOneAndUpdate(
            { _id: commentId },
            { '$inc': { 'dislike': -1 }},
            { fields: { like: 1, dislike: 1 }, new: true }
          )
        } else if (commentLikeInfo.evaluation === 'none') {
          updatedCommentLikeInfo = await commentLikeModel.findOneAndUpdate(
            commentLikeFilter,
            { evaluation: 'none' },
            { fields: { commentId: 1, evaluation: 1 }, new: true }
          )

          updatedCommentInfo = await boardCommentModel.findOneAndUpdate(
            { _id: commentId },
            { '$inc': { 'dislike': 1 }},
            { fields: { like: 1, dislike: 1 }, new: true }
          )
        }
      }
    }

    let response = {
      result: 'success',
      commentInfo: {
        like: updatedCommentInfo.like,
        evaluation: updatedCommentLikeInfo.evaluation
      },
    }

    res.status(200).json(response)
  } catch (error) {
    console.log(error)
    next(createError(500, 'server error'))
  }
}

exports.putBoardLike = async (req, res, next) => {
  try {
    let isLike = req.body.isLike

    if (typeof isLike !== 'boolean') {
      next(createError(400, 'bad request'))
      return
    }

    let myObjectId = res.locals.userObjectId
    let boardId = req.params.id

    let filter = {
      userId: myObjectId,
      boardId: boardId,
    }

    boardLikeInfo = await boardLikeModel.findOne(filter)

    if (!boardLikeInfo) {
      let boardLikeInfo = {
        userId: myObjectId,
        boardId: boardId,
        evaluation: isLike ? 'like' : 'dislike'
      }

      await boardLikeModel.createOrSave(boardLikeInfo)

      if (isLike) {
        await boardModel.findOneAndUpdate(
          { _id: boardId },
          {'$inc': {'like': 1}},
        )
      } else {
        await boardModel.findOneAndUpdate(
          { _id: boardId },
          {'$inc': {'dislike': 1}},
        )
      }
    }  else {
      let evaluation = boardLikeInfo.evaluation
      
      // 추천 취소
      if (isLike && evaluation === 'like') {
        await boardLikeModel.findOneAndUpdate(
          { _id: boardLikeInfo._id },
          { evaluation: 'none'}
        )

        await boardModel.findOneAndUpdate(
          { _id: boardId },
          {'$inc': {'like': -1}},
        )
      
      // 비추천 -> 추천
      } else if (isLike && evaluation === 'dislike') {
        await boardLikeModel.findOneAndUpdate(
          { _id: boardLikeInfo._id },
          { evaluation: 'like'}
        )

        await boardModel.findOneAndUpdate(
          { _id: boardId },
          {
            '$inc': {
              'like': 1,
              'dislike': -1
            }
          }
        )


      // 추천 -> 비추천
      } else if (!isLike && evaluation === 'like') {
        await boardLikeModel.findOneAndUpdate(
          { _id: boardLikeInfo._id },
          { evaluation: 'dislike'}
        )

        await boardModel.findOneAndUpdate(
          { _id: boardId },
          {
            '$inc': {
              'like': -1,
              'dislike': 1
            }
          }
        )

      // 비추천 취소
      } else if (!isLike && evaluation === 'dislike') {
        await boardLikeModel.findOneAndUpdate(
          { _id: boardLikeInfo._id },
          { evaluation: 'none'}
        )

        await boardModel.findOneAndUpdate(
          { _id: boardId },
          {'$inc': {'dislike': -1}},
        )

      // 평가되지 않은 상태에서 추천
      } else if (isLike && evaluation === 'none') {
        await boardLikeModel.findOneAndUpdate(
          { _id: boardLikeInfo._id },
          { evaluation: 'like'}
        )

        await boardModel.findOneAndUpdate(
          { _id: boardId },
          {'$inc': {'like': 1}},
        )

      // 평가되지 않은 상태에서 비추천
      } else if (!isLike && evaluation === 'none') {
        await boardLikeModel.findOneAndUpdate(
          { _id: boardLikeInfo._id },
          { evaluation: 'dislike'}
        )

        await boardModel.findOneAndUpdate(
          { _id: boardId },
          {'$inc': {'dislike': 1}},
        )
      }
    }

    res.status(200).json({result: 'success'})
  } catch (err) {
    console.log(err)
    next(createError(500, 'server error'))
  }
}

exports.getBoardDetail = async (req, res, next) => {
  try {
    let ObjectId = require('mongodb').ObjectId;
    let boardId = new ObjectId(req.params.id)
    let myObjectId = res.locals.userObjectId

    let boardInfo = await boardModel.aggregate([
      { $match: { _id: boardId, isDelete: false } },
      {
        $lookup:
        {
          from: "board_categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "categoryInfo"
        }
      }
    ])

    if (!boardInfo || !Array.isArray(boardInfo) || boardInfo.length < 1) {
      next(createError(400, '삭제된 게시글 입니다.'))
      return
    }

    boardInfo = boardInfo[0]

    await boardModel.findOneAndUpdate(
      { _id: boardId },
      { view: boardInfo.view + 1 }
    )
    
    let responseData = {
      isMyBoard: String(boardInfo.writerUserId) === myObjectId,
      nickname: boardInfo.nickname,
      title: boardInfo.title,
      content: boardInfo.content,
      view: boardInfo.view,
      like: boardInfo.like,
      dislike: boardInfo.dislike,
      categoryType: boardInfo.categoryInfo[0].type,
      createdAt: boardInfo.createdAt,
    }

    boardLikeInfo = await boardLikeModel.findOne({
      userId: myObjectId,
      boardId: boardId
    })

    if (boardLikeInfo) {
      responseData.evaluation = boardLikeInfo.evaluation
    } else {
      responseData.evaluation = 'none'
    }

    res.status(200).json({
      result: responseData
    });
  } catch (err) {
    console.log(err)
    next(createError(500, 'server error'))
  }
}