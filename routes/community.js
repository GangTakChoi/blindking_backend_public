var express = require('express');
var router = express.Router();

var communityControllers = require('../controllers/community.controllers')
var fileUpload = require('../middlewares/s3Upload.js')

router.get('/detail/:id', communityControllers.getBoardDetail);
router.get('/board-list', communityControllers.getBoardList)

router.post('/image-upload', fileUpload.single('upload'), communityControllers.fileupload); 
router.post('/board', communityControllers.writeCommunity); 



module.exports = router;