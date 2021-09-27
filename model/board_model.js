const mongoose = require('mongoose');

// 게시판
const boardSchema = new mongoose.Schema({
  writerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nickname: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  searchContent: { type: String, required: true },
  view: { type: Number, default: 0, required: true},
  like: { type: Number, default: 0, required: true},
  dislike: { type: Number, default: 0, required: true},
  category: { type: Number, default: 0, required: true },
  commentCount: { type: Number, default: 0, required: true },
  isDelete: { type: Boolean, default: false, required: true },
  isShow: {type: Boolean, default: true, required: true},
},
{
  versionKey: false,
  timestamps: true
},
{
  collection: 'board'
}
);

boardSchema.index({title: 'text', content: 'text', nickname: 'text', isDelete: 1, isShow: 1, category: 1, like: -1, view: -1})

boardSchema.statics.createOrSave = function (payload) {
  // this === Model
  const board = new this(payload);
  // return Promise
  return board.save();
};

// Create Model & Export
module.exports = mongoose.model('board', boardSchema);