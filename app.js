var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const mongoose = require('mongoose');
var { apiCommonLimiter } = require('./middlewares/apiRateLimit')

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var communityRouter = require('./routes/community');
var adminRouter = require('./routes/admin');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 기본 헤더(header) 설정
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.ORIGIN_URL)
  res.header("Access-Control-Allow-Headers", "Content-Type,Content-Security-Policy")
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS,PUT,DELETE")
  res.header("Access-Control-Allow-Credentials", "true")
  next()
})

// CONNECT TO MONGODB SERVER
mongoose
  .connect(process.env.DB_HOST, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true, useFindAndModify: false })
  .then(() => console.log('mongoose Successfully connected to mongodb'))
  .catch(e => console.error(e));

// Api Rate Limit
app.use(apiCommonLimiter)
// ROUTE Handling
app.use('/', indexRouter);
app.use('/user', usersRouter);
app.use('/community', communityRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  console.log(err)
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
