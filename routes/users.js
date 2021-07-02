var express = require('express');
var router = express.Router();

var userControllers = require('../controllers/user.controllers')
var { verifyToken } = require('../middlewares/authorization')

// 매칭 파트너 정보
router.get('/maching-partners', verifyToken, userControllers.getMachingPartnerList);
// 특정 파트너 자세한 정보
router.get('/maching-partners/:id', verifyToken, userControllers.getMachingPartnerDetail);
// 유저 정보
router.get('/me', verifyToken, userControllers.getUserInfo);
// 친구 요청 보낸 목록
router.get('/send-request-friends', verifyToken, userControllers.getSendRequestFriendList)
// 친구 요청 받은 목록
router.get('/friends', verifyToken, userControllers.getFriendInfoList)

// 회원가입
router.post('/', userControllers.addUser); 
// 로그인 토큰발행
router.post('/login', userControllers.createToken); 
// 자기소개 작성
router.post('/self-introduction', verifyToken, userControllers.setSelfIntroduction);
// 친구 요청
router.post('/friend/:userObjectId', verifyToken, userControllers.requestFriend);
// 친구 수락
router.post('/friend/:userObjectId/accept', verifyToken, userControllers.acceptFriend);
// 친구 요청 거절
router.post('/friend/:userObjectId/reject', verifyToken, userControllers.rejectFriend);
// 친구 차단
router.post('/friend/:userObjectId/block', verifyToken, userControllers.blockFriend);


module.exports = router;
