const mongoose = require('mongoose');

// 게시판
const boardCommentSchema = new mongoose.Schema({
  writerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nickname: { type: String, required: true },
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  content: { type: String, required: true },
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

boardCommentSchema.index( {writerUserId: 1}, { boardId: 1 }, { isDelete: 1 });

boardCommentSchema.statics.createOrSave = function (payload) {
  // this === Model
  const boardComment = new this(payload);
  // return Promise
  return boardComment.save();
};

// Create Model & Export
module.exports = mongoose.model('board_comment', boardCommentSchema);