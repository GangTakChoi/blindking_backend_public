const mongoose = require('mongoose');

// 게시판
const boardCommentSchema = new mongoose.Schema({
  rootCommentId: { type: mongoose.Schema.Types.ObjectId, ref: 'board_comment', default: null },
  writerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  gender: { type: String, required: true, enum: ['male', 'female'] },
  nickname: { type: String, required: true },
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'board', required: true },
  content: { type: String, required: true },
  like: { type: Number, default: 0, required: true},
  dislike: { type: Number, default: 0, required: true},
  subCommentCount: { type: Number, default: 0, required: true },
  isDelete: { type: Boolean, default: false, required: true },
},
{
  timestamps: true,
  versionKey: false
},
{
  collection: 'board_comment'
}
);

boardCommentSchema.index( { writerUserId: 1 }, { boardId: 1 }, { isDelete: 1 });

boardCommentSchema.statics.createOrSave = function (payload) {
  // this === Model
  const boardComment = new this(payload);
  // return Promise
  return boardComment.save();
};

// Create Model & Export
module.exports = mongoose.model('board_comment', boardCommentSchema);