const mongoose = require('mongoose');

// 게시판
const boardSchema = new mongoose.Schema({
  writerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, index: true, required: true },
  content: { type: String, required: true },
  view: { type: Number, default: 0, required: true},
  like: { type: Number, default: 0, required: true},
  dislike: { type: Number, default: 0, required: true},
  commentCount: { type: Number, default: 0, required: true },
  isDelete: { type: Boolean, index: true, default: false, required: true },
  isShow: {type: Boolean, index: true, default: true, required: true},
},
{
  timestamps: true
},
{
  collection: 'board'
}
);

boardSchema.index({title: 'text', content: 'text'})

boardSchema.statics.createOrSave = function (payload) {
  // this === Model
  const board = new this(payload);
  // return Promise
  return board.save();
};

// Create Model & Export
module.exports = mongoose.model('board', boardSchema);