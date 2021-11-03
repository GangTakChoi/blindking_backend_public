var express = require('express');
var router = express.Router();


var communityControllers = require('../controllers/community.controllers')
var { apiCommonLimiter, apiBoardLikeLimiter } = require('../middlewares/apiRateLimit')
var { verifyToken, verifyAdminToken, setUserInfo } = require('../middlewares/authorization')

// 게시글 조회
router.get('/board/:id', setUserInfo, communityControllers.getBoardDetail);
// 게시글 리스트 조회
router.get('/board-list', setUserInfo, communityControllers.getBoardList);
// 게시글 댓글 조회
router.get('/board/:boardId/comment', setUserInfo, communityControllers.getBoardComment)
// 게시글 대댓글 조회
router.get('/board/:boardId/comment/:rootCommentId/sub-comment', setUserInfo, communityControllers.getSubComment)
// 카테고리 조회
router.get('/category', setUserInfo, communityControllers.getCategory)

// 게시글 이미지 업로드
router.post('/image-upload', verifyToken, communityControllers.fileupload);
// 게시글 작성
router.post('/board', verifyToken, communityControllers.writeBoard);
// 댓글 작성
router.post('/board/:id/comment', verifyToken, communityControllers.writeBoardOfComment);
// 대-댓글 작성
router.post('/board/:boardId/comment/:commentId/sub-comment', verifyToken, communityControllers.registSubComment)
// 카테고리 추가
router.post('/category', verifyAdminToken, communityControllers.addCategory)
// 게시글 신고
router.post('/board/:boardId/report', verifyToken, communityControllers.reportBoard)
// 댓글 신고
router.post('/board/:boardId/comment/:commentId/report', verifyToken, communityControllers.reportComment)

// 게시글 좋아요, 싫어요
router.put('/board/:id/like-dislike', apiBoardLikeLimiter, verifyToken, communityControllers.putBoardLike);
// 게시글 수정
router.put('/board/:id', verifyToken, communityControllers.modifyBoard);
// 댓글 좋아요, 싫어요
router.put('/board/:boardId/comment/:commentId', apiBoardLikeLimiter, verifyToken, communityControllers.putCommentLike)
// 카테고리 수정
router.put('/category/:categoryId', verifyAdminToken, communityControllers.putCategoy)

// 게시글 삭제
router.delete('/board/:boardId', verifyToken, communityControllers.deleteBoard);
// 댓글 삭제
router.delete('/board/:boardId/comment/:commentId', verifyToken, communityControllers.deleteComment);
// 카테고리 삭제
router.delete('/category/:categoryId', verifyToken, communityControllers.deleteCategory)



module.exports = router;