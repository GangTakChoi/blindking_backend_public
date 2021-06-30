var express = require('express');
var router = express.Router();

var testControllers = require('../controllers/test.controllers')

router.post('/', testControllers.addTodo);

module.exports = router;
