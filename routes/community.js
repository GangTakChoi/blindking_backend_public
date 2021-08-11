var express = require('express');
var router = express.Router();

var communityControllers = require('../controllers/community.controllers')
var { verifyToken } = require('../middlewares/authorization')
var fileUpload = require('../middlewares/s3Upload.js')

router.get('/board/:id', verifyToken, communityControllers.getBoardDetail);
router.get('/board-list', verifyToken, communityControllers.getBoardList);

router.post('/image-upload', verifyToken, fileUpload.single('upload'), communityControllers.fileupload); 
router.post('/board', verifyToken, communityControllers.writeBoard);
router.post('/board/:id/comment', verifyToken, communityControllers.writeBoardOfComment);

router.put('/board/:id/like-dislike', verifyToken, communityControllers.putBoardLike);



module.exports = router;