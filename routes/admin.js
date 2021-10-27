var express = require('express');
var router = express.Router();

var adminControllers = require('../controllers/admin.controllers')

var { verifyAdminToken } = require('../middlewares/authorization')

// 자기소개 질문 조회
router.get('/selt-introduction/question-list', verifyAdminToken, adminControllers.getQuestionList);

// 자기소개 질문 추가
router.post('/selt-introduction/question', verifyAdminToken, adminControllers.addQuestion);

// 자기소개 질문 순서 수정
router.put('/selt-introduction/question-list/order', verifyAdminToken, adminControllers.putQuestionOrderInfo)
// 자기소개 질문 수정
router.put('/selt-introduction/question-list/:questionId', verifyAdminToken, adminControllers.putQuestInfo);

// 자기소개 질문 삭제
router.delete('/selt-introduction/question-list/:questionId', verifyAdminToken, adminControllers.deleteQuestion);

module.exports = router;