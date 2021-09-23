var express = require('express');
var router = express.Router();


var communityControllers = require('../controllers/community.controllers')
var { apiBoardLikeLimiter } = require('../middlewares/apiRateLimit')
var { verifyToken } = require('../middlewares/authorization')

// 게시글 조회
router.get('/board/:id', verifyToken, communityControllers.getBoardDetail);
// 게시글 리스트 조회
router.get('/board-list', verifyToken, communityControllers.getBoardList);
// 게시글 댓글 조회
router.get('/board/:boardId/comment', verifyToken, communityControllers.getBoardComment)

// 게시글 이미지 업로드
router.post('/image-upload', verifyToken, communityControllers.fileupload);
// 게시글 작성
router.post('/board', verifyToken, communityControllers.writeBoard);
// 댓글 작성
router.post('/board/:id/comment', verifyToken, communityControllers.writeBoardOfComment);

// 게시글 좋아요, 싫어요
router.put('/board/:id/like-dislike', apiBoardLikeLimiter, verifyToken, communityControllers.putBoardLike);
// 게시글 수정
router.put('/board/:id', verifyToken, communityControllers.modifyBoard);

// 게시글 삭제
router.delete('/board/:boardId', verifyToken, communityControllers.deleteBoard);
// 댓글 삭제
router.delete('/board/:boardId/comment/:commentId', verifyToken, communityControllers.deleteComment);



module.exports = router;