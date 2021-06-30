var express = require('express');
var router = express.Router();

var { verifyToken } = require('../middlewares/authorization')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/verify-token', verifyToken, 
  (req, res, next) => {
    res.status(200).json({result: 'ok'})
  }
);

module.exports = router;
