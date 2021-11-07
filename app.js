const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const { apiCommonLimiter } = require('./middlewares/apiRateLimit')
const { setHeader } = require('./middlewares/responseHeader')
const helmet = require('helmet')

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const communityRouter = require('./routes/community');
const adminRouter = require('./routes/admin');

const app = express();

app.disable('x-powered-by')
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(helmet())

// CONNECT TO MONGODB SERVER
mongoose
  .connect(process.env.DB_HOST, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true, useFindAndModify: false })
  .then(() => console.log('mongoose Successfully connected to mongodb'))
  .catch(e => console.error(e));

// Api Rate Limit (Dos)
app.use(apiCommonLimiter)
// Set Header
app.use(setHeader)
// Routing
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
  console.log(err)

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = process.env.NODE_ENV === 'development' ? err : {};
  
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
