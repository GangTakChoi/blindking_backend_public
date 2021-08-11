const boardModel = require('../model/board_model')
const boardLikeModel = require('../model/board_like_model')
const boardCommentModel = require('../model/board_comment')

exports.getBoardList = async (req, res, next) => {
  try {
    // let filter = {
    //   isDelete: false,
    //   isShow: true,
    // }

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
      if (searchOption !== 'nickname' && searchOption !== 'title' && searchOption !== 'content' && searchOption !== 'title+content' ) {
        res.status(400).json({
          errorMessage: 'bad request'
        })
        return
      }

      if (searchOption === 'title') {
        filter.$or = [{title: new RegExp(searchContent)}]
      } else if (searchOption === 'content') {
        filter.$or = [{content: new RegExp(searchContent)}]
      } else if (searchOption === 'title+content') {
        filter.$or = [{title: new RegExp(searchContent)}, {content: new RegExp(searchContent)}]
      }
    }

    let boardList = await boardModel
    .find(filter)
    .populate('writerUserId')
    .sort({ _id: -1 })
    .skip(( currentPage - 1 ) * countPerPage)
    .limit(countPerPage)

    // let boardList = await boardModel
    // .find(filter)
    // .populate('writerUserId')
    // .sort({ _id: -1 })
    // .skip(( currentPage - 1 ) * countPerPage)
    // .limit(countPerPage)

    let totalBoardCount = await boardModel.countDocuments(filter)

    let lastPageNumber = Math.ceil(totalBoardCount / countPerPage)

    let responseData = []
  
    if (boardList === null) {
      res.status(200).json({
        boardList: responseData
      })
    }

    boardList.forEach((boardInfo) => {
      let tempBoardInfo = {
        Objectid: boardInfo._id,
        nickname: boardInfo.writerUserId.nickname,
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
  const multer = require('multer')

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

exports.writeBoardOfComment = async (req, res, next) => {
  try {
    let userId = res.locals.userObjectId
    let boardId = req.params.id
    let content = req.body.content
    let nickname = res.locals.userNickname

    let boardCommentInfo = {
      writerUserId: userId,
      boardId: boardId,
      content: content,
      isDelete: false,
    }

    let savedCommentInfo = await boardCommentModel.createOrSave(boardCommentInfo)

    if (!savedCommentInfo) {
      throw('[writeBoardOfComment]' + '댓글 등록 실패')
    }

    let filter = {
      boardId: boardId,
      isDelete: false
    }

    let commentCount = await boardCommentModel.countDocuments(filter)

    await boardModel.findOneAndUpdate(
      {_id: boardId},
      {commentCount: commentCount},
    )

    // if (boardCommentInfoList || !Array.isArray(boardCommentInfoList)) {
    //   throw('[' + this + ']' + '댓글 리스트 정보 조회 실패')
    // }

    let commentInfo = {
      nickname: nickname,
      createdDate: savedCommentInfo.createdAt,
      content: savedCommentInfo.content,
    }

    // boardCommentInfoList.forEach((commentInfo) => {
    //   let tempCommentInfo = {
    //     nickname: commentInfo.writerUserId.nickname,
    //     content: commentInfo.content,
    //     createdDate: commentInfo.createdAt,
    //   }

    //   commentInfoList.push(tempCommentInfo)
    // })

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

exports.writeBoard = async (req, res, next) => {
  try {
    let boardInfo = {
      writerUserId: res.locals.userObjectId,
      title: req.body.title,
      content: req.body.content,
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

    boardInfo = await boardModel.findOne({ _id: boardId}).populate('writerUserId')

    await boardModel.findOneAndUpdate(
      { _id: boardId },
      { view: boardInfo.view + 1 }
    )

    let boardCommentInfoList = []

    result = await boardCommentModel
    .find({boardId: boardId, isDelete: false})
    .populate('writerUserId', 'nickname')
    .sort({ _id: -1 })

    if (result && Array.isArray(result) && result.length !== 0) {
      result.forEach((data) => {
        let commentInfo = {
          nickname: data.writerUserId.nickname,
          content: data.content,
          createdDate: data.createdAt,
        }

        boardCommentInfoList.push(commentInfo)
      })
    }
    
    let responseData = {
      nickname: boardInfo.writerUserId.nickname,
      title: boardInfo.title,
      content: boardInfo.content,
      view: boardInfo.view,
      like: boardInfo.like,
      dislike: boardInfo.dislike,
      createdAt: boardInfo.createdAt,
      boardCommentInfoList: boardCommentInfoList,
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