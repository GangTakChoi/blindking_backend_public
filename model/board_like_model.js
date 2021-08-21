const mongoose = require('mongoose');

// 게시판
const boardLikeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  evaluation: { type: String, enum: ['like', 'dislike', 'none'], required: true }
},
{
  versionKey: false 
},
{
  collection: 'board_like'
}
);

boardLikeSchema.index({ userId: 1, boardId: 1}, { unique: true });

boardLikeSchema.statics.createOrSave = function (payload) {
  // this === Model
  const board = new this(payload);
  // return Promise
  return board.save();
};

// Create Model & Export
module.exports = mongoose.model('board_like', boardLikeSchema);