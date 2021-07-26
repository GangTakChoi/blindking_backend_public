const communityModel = require('../model/community_model')

exports.getBoardList = async (req, res, next) => {
  try {
    let boardList = await communityModel.find()
    .sort({createdAt: -1})
    .limit(30)

    let responseData = []
  
    if (boardList === null) {
      res.status(200).json({
        boardList: responseData
      })
    }

    boardList.forEach((boardInfo) => {
      let tempBoardInfo = {
        Objectid: boardInfo._id,
        title: boardInfo.title,
        view: boardInfo.view,
        like: boardInfo.like,
      }

      responseData.push(tempBoardInfo)
    })
  
    res.status(200).json({
      boardList: responseData
    })
  } catch (err) {
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
    let boardInfo = {
      title: req.body.title,
      content: req.body.content,
      view: 0,
      like: 0,
      isDelete: false,
      isShow: true
    }
  
    await communityModel.createOrSave(boardInfo)
  
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

exports.getBoardDetail = async (req, res, next) => {
  try {
    let boardId = req.params.id

    boardInfo = await communityModel.findOne({ _id: boardId})
    
    let responseData = {
      title: boardInfo.title,
      content: boardInfo.content,
      view: boardInfo.view,
      like: boardInfo.like,
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