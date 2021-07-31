const boardModel = require('../model/board_model')
const boardLikeModel = require('../model/board_like_model')

exports.getBoardList = async (req, res, next) => {
  try {
    let filter = {
      isDelete: false,
      isShow: true,
    }
    let currentPage = Number(req.query.page)
    let countPerPage = Number(req.query.countPerPage)

    let boardList = await boardModel
    .find(filter)
    .populate('writerUserId')
    .sort({ createdAt: -1 })
    .skip(( currentPage - 1 ) * countPerPage)
    .limit(countPerPage)

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

exports.fileupload = async (req, res, next) => {
  try {
    res.status(200).json({
      "url": req.file.location
    });
  } catch (err) {
    res.status(500).json({
      result: 'server error'
    });
  }
  
}

exports.writeCommunity = async (req, res, next) => {
  try {
    console.log(req.body.content)
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
    
    let responseData = {
      nickname: boardInfo.writerUserId.nickname,
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