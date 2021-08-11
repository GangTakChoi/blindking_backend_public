const mongoose = require('mongoose');

// 게시판
const boardCommentSchema = new mongoose.Schema({
  writerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', index: true, required: true },
  content: { type: String, required: true },
  isDelete: { type: Boolean, index: true, default: false, required: true },
},
{
  timestamps: true
},
{
  collection: 'board_comment'
}
);

boardCommentSchema.statics.createOrSave = function (payload) {
  // this === Model
  const boardComment = new this(payload);
  // return Promise
  return boardComment.save();
};

// Create Model & Export
module.exports = mongoose.model('board_comment', boardCommentSchema);