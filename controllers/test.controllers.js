const Todo = require('../model/todo')
const User = require('../model/user_model')

exports.addTodo = async function (req, res, next) {
  // console.log(req.body)
  // Todo.create(req.body)
  // .then(todo => res.send(todo))
  // .catch(err => res.status(500).send(err));
  User.findOneById("chlrkdxkr")
  .then(users => res.send(users))
  .catch(err => res.status(500).send(err))
};