const boardModel = require('../model/board_model')
const boardLikeModel = require('../model/board_like_model')
const boardCommentModel = require('../model/board_comment')
const commentLikeModel = require('../model/comment_like_model')

exports.getBoardList = async (req, res, next) => {
  try {
    let filter = {
      $and: [{isDelete: false},{isShow: true}],
    }

    let currentPage = Number(req.query.page)
    let countPerPage = Number(req.query.countPerPage)
    let searchOption = req.query.searchOption
    let searchContent = req.query.searchContent

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
        res.status(400).json({
          errorMessage: 'bad request'
        })
        return
      }
    }

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
    })
  } catch (err) {
    console.log(err)
    res.status(500).json({
      result: 'server error'
    });
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

      res.status(500).json({
        "error": {
          "message": errorMessage
        }
      });
      return
    }

    res.status(200).json({
      "url": req.file.location
    });
  })
}

exports.deleteComment = async (req, res, next) => {
  try {
    let boardId = req.params.boardId
    let commentId = req.params.commentId
    let myObjectId = res.locals.userObjectId

    let commentInfo = await boardCommentModel.findOne({_id: commentId})
    .populate('writerUserId', '_id')

    // 유효성 검사
    if (!commentInfo || String(commentInfo.writerUserId._id) !== myObjectId) {
      res.status(400).json({
        result: 'invalid request'
      });
      return
    }

    // 댓글 삭제 처리
    await boardCommentModel.findOneAndUpdate(
      {_id: commentId},
      {isDelete: true},
    )

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
    });
  } catch (e) {
    console.log(e)
    res.status(500).json({
      result: 'server error'
    });
  }
}

exports.writeBoardOfComment = async (req, res, next) => {
  try {
    let userId = res.locals.userObjectId
    let boardId = req.params.id
    let nickname = res.locals.userNickname

    if (!req.body.content || req.body.content.length > 5000) {
      res.status(400).json({ errorMessage: 'invalid request' });
      return
    }

    let boardCommentInfo = {
      writerUserId: userId,
      nickname: nickname,
      boardId: boardId,
      content: req.body.content,
      isDelete: false,
    }

    let boardResult = await boardModel.findOne({ _id: boardId, isDelete: false }, { _id: 1 })
    
    // 해당 게시판 유효성 검사
    if (!boardResult) {
      res.status(400).json({ errorMessage: 'invalid request' });
      return
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
    res.status(500).json({
      result: 'server error'
    });
  }
}

exports.deleteBoard = async (req, res, next) => {
  try {
    let boardId = req.params.boardId
    let myObjectId = res.locals.userObjectId

    let boardInfo = await boardModel.findOne(
      { _id: boardId, writerUserId: myObjectId, isDelete: false },
      { _id: 1 }
    )

    if (!boardInfo) {
      res.status(400).json({ errorMessage: 'invalid request' })
      return
    }

    await boardModel.findOneAndUpdate(
      { _id: boardInfo._id },
      { isDelete: true }
    )

    res.status(200).json({ result: 'success' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ errorMessage: 'server error' })
  }
}

exports.modifyBoard = async (req, res, next) => {
  try {
    if (!req.body.title.trim()) {
      res.status(400).json({ errorMessage: '제목을 입력해주세요.' });
      return
    }

    if (req.body.title.length > 100) {
      res.status(400).json({ errorMessage: '제목은 100자 이내로 입력 가능합니다.' });
      return
    }

    if (!req.body.content.trim()) {
      res.status(400).json({ errorMessage: '내용을 입력해주세요.' });
      return
    }

    if (!req.body.content.length > 50000) {
      res.status(400).json({ errorMessage: '내용이 너무 깁니다.' });
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
      res.status(400).json({errorMessage: 'invalid request'});
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
    res.status(500).json({
      result: 'server error'
    });
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
      res.status(400).json({ errorMessage: "invalid request" })
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
    let rawBoardCommentList = await boardCommentModel.find({ boardId: boardId, isDelete: false })
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
    res.status(500).json({ errorMessage: 'server error' })
  }
}

exports.writeBoard = async (req, res, next) => {
  try {
    if (!req.body.title.trim()) {
      res.status(400).json({ errorMessage: '제목을 입력해주세요.' });
      return
    }

    if (req.body.title.length > 100) {
      res.status(400).json({ errorMessage: '제목은 100자 이내로 입력 가능합니다.' });
      return
    }

    if (!req.body.content.trim()) {
      res.status(400).json({ errorMessage: '내용을 입력해주세요.' });
      return
    }

    if (!req.body.content.length > 50000) {
      res.status(400).json({ errorMessage: '내용이 너무 깁니다.' });
      return
    }

    let boardInfo = {
      writerUserId: res.locals.userObjectId,
      nickname: res.locals.userNickname,
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
    }
  
    await boardModel.createOrSave(boardInfo)
  
    res.status(200).json({
      result: 'success'
    });
  } catch (err) {
    console.log(err)
    res.status(500).json({
      result: 'server error'
    });
  }
}

exports.putCommentLike = async (req, res, next) => {
  try {
    let myObjectId = res.locals.userObjectId
    let boardId = req.params.boardId
    let commentId = req.params.commentId
    let status = req.body.status

    if (status !== 'like' && status !== 'dislike') {
      res.status(400).json({ errorMessage: 'invalid requset' })
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
    res.status(500).json({errorMessage: 'server error'})
  }
}

exports.putBoardLike = async (req, res, next) => {
  try {
    let isLike = req.body.isLike

    if (typeof isLike !== 'boolean') {
      res.status(400).json({
        result: 'bad request'
      });
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
    res.status(500).json({
      result: 'server error'
    });
  }
}

exports.getBoardDetail = async (req, res, next) => {
  try {
    let boardId = req.params.id
    let myObjectId = res.locals.userObjectId

    let boardInfo = await boardModel.findOne({ _id: boardId, isDelete: false})

    if (!boardInfo) {
      res.status(400).json({ errorMessage: '삭제된 게시글 입니다.' })
      return
    }

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
    res.status(500).json({
      result: 'server error'
    });
  }
}