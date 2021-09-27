const mongoose = require('mongoose');

const commentLikeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'board_comment', required: true },
  evaluation: { type: String, enum: ['like', 'dislike', 'none'], required: true }
},
{
  versionKey: false 
},
{
  collection: 'comment_like'
}
);

commentLikeSchema.index({ userId: 1, commentId: 1 }, { unique: true });

commentLikeSchema.statics.createOrSave = function (payload) {
  // this === Model
  const commentLike = new this(payload);
  // return Promise
  return commentLike.save();
};

// Create Model & Export
module.exports = mongoose.model('comment_like', commentLikeSchema);