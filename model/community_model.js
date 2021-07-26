const mongoose = require('mongoose');

// 게시판
const boardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  view: { type: Number, default: 0, required: true},
  like: { type: Number, default: 0, required: true},
  isDelete: { type: Boolean, default: false, required: true },
  isShow: {type: Boolean, default: true, required: true}
},
{
  timestamps: true
},
{
  collection: 'board'
}
);

boardSchema.statics.createOrSave = function (payload) {
  // this === Model
  const board = new this(payload);
  // return Promise
  return board.save();
};

// Create Model & Export
module.exports = mongoose.model('board', boardSchema);