var express = require('express');
var router = express.Router();


var communityControllers = require('../controllers/community.controllers')
var { apiBoardLikeLimiter } = require('../middlewares/apiRateLimit')
var { verifyToken } = require('../middlewares/authorization')

router.get('/board/:id', verifyToken, communityControllers.getBoardDetail);
router.get('/board-list', verifyToken, communityControllers.getBoardList);

router.post('/image-upload', verifyToken, communityControllers.fileupload);
router.post('/board', verifyToken, communityControllers.writeBoard);
router.post('/board/:id/comment', verifyToken, communityControllers.writeBoardOfComment);

router.put('/board/:id/like-dislike', apiBoardLikeLimiter, verifyToken, communityControllers.putBoardLike);

router.delete('/board/:boardId/comment/:commentId', verifyToken, communityControllers.deleteComment);



module.exports = router;