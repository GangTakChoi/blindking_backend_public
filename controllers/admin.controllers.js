const userModel = require('../model/user_model')
const questionListModel = require('../model/question_list_model')

exports.getQuestionList = async (req, res, next) => {
  try {
    let myObjectId = res.locals.userObjectId

    let userInfo = await userModel.findOne({_id: myObjectId}, {roleName: 1})

    if (userInfo.roleName !== 'admin') {
      res.status(400).json({errorMessage: 'invalid request'})
      return
    }

    let questionList = await questionListModel.find({ isDelete: false }).sort({ order: 1 })

    res.status(200).json({result: 'success', questionList: questionList})
  } catch (error) {
    console.log(error)
    res.status(500).json({errorMessage: 'server error'})
  }
}

exports.addQuestion = async (req, res, next) => {
  try {
    let myObjectId = res.locals.userObjectId
    let questionInputType = req.body.inputType
    let questionContent = req.body.content

    if (typeof questionInputType !== 'string' || questionInputType.length > 100) {
      res.status(400).json({errorMessage: 'inputType invalid value'})
      return
    }

    if (typeof questionContent !== 'string' || questionContent.length > 1000) {
      res.status(400).json({errorMessage: 'content too long'})
      return
    }

    let userInfo = await userModel.findOne({_id: myObjectId}, {roleName: 1})

    if (userInfo.roleName !== 'admin') {
      res.status(400).json({errorMessage: 'invalid request'})
      return
    }

    let questionLastOrderInfo = await questionListModel.find({ isDelete: false }, {order: 1})
    .sort({order: -1})
    .limit(1)

    if (questionLastOrderInfo.length < 1) {
      res.status(400).json({errorMessage: 'question last order number search fail'})
      return
    }

    let questionLastOrderNumber = questionLastOrderInfo[0].order

    let addQuestionInfo = {
      order: questionLastOrderNumber + 1,
      content: questionContent,
      inputType: questionInputType,
    }

    let qestionInfo = await questionListModel.createOrSave(addQuestionInfo)

    res.status(200).json({ result: 'success', questionInfo: qestionInfo })
  } catch (error) {
    console.log(error)
    res.status(500).json({errorMessage: 'server error'})
  }
}

exports.putQuestInfo = async (req, res, next) => {
  try {
    let questionId = req.params.questionId
    let myObejctId = res.locals.userObjectId
    let questionContent = req.body.content
    let questionInputType = req.body.inputType

    if (typeof questionContent !== 'string' || questionContent.length > 1000) {
      res.status(400).json({ errorMessage: 'content too long' })
      return
    }

    if (typeof questionInputType !== 'string' || questionInputType.length > 100) {
      res.status(400).json({ errorMessage: 'inputType invalid' })
      return
    }

    let userInfo = await userModel.findOne({_id: myObejctId}, {roleName: 1})

    if (!userInfo || userInfo.roleName !== 'admin') {
      res.status(400).json({ errorMessage: 'invalid request' })
      return
    }

    let updateedQuestionInfo = await questionListModel.findOneAndUpdate(
      { _id: questionId },
      { 
        content: questionContent,
        inputType: questionInputType,
      },
      { new: true }
    )

    res.status(200).json({ result:'success', questionInfo: updateedQuestionInfo })
  } catch {
    console.log(error)
    res.status(500).json({ errorMessage: 'server error' })
  }
}

exports.putQuestionOrderInfo = async (req, res, next) => {
  try {
    let questionOrderInfoList = req.body.questionOrderInfoList

    if (!Array.isArray(questionOrderInfoList)) {
      res.status(400).json({ errorMessage: 'question order info invalid value' })
      return
    }

    let questionCount = await questionListModel.countDocuments({ isDelete: false })

    if (questionOrderInfoList.length !== questionCount) {
      res.status(400).json({ errorMessage: 'question count not equal' })
      return
    }

    questionOrderInfoList.forEach(async (questionInfo) => {
      await questionListModel.findOneAndUpdate({_id: questionInfo._id}, {order: questionInfo.order} )
    })
    
    res.status(200).json({ result: 'success' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ errorMessage: 'server error' })
  }
}

exports.deleteQuestion = async (req, res, next) => {
  try {
    let questionId = req.params.questionId
    let myObjectId = res.locals.userObjectId

    let userInfo = await userModel.findOne({ _id: myObjectId }, { roleName: 1 })

    if (!userInfo || userInfo.roleName !== 'admin') {
      res.status(400).json({ errorMessage: 'invalid request' })
      return
    }

    let deletedQuestionOrderInfo = await questionListModel.findOneAndUpdate(
      { _id: questionId },
      { isDelete: true, order: 0 },
      { new: true }
    )

    let deletedQuestionOrder = deletedQuestionOrderInfo.order

    await questionListModel.updateMany(
      {
        isDelete: false,
        order: { $gt: deletedQuestionOrder }
      },
      {
        $inc: { order: -1 }
      }
    )

    res.status(200).json({ result: 'success' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ errorMessage: 'server error' })
  }
}