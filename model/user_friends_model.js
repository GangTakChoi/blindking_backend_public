const mongoose = require('mongoose');

// 회원 친구 정보
const userFriendSchema = new mongoose.Schema({
  userObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  friendObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {type: String, required: true, enum: ['wait', 'reject', 'accept', 'block', 'request']}, // 대기: wait, 거절: reject, 수락: accept, 차단: block, 요청: request
},
{
  timestamps: true
},
{
  collection: 'user_friend'
}
);

userFriendSchema.index({ userObjectId: 1, friendObjectId: 1}, { unique: true });

// Create new users document
userFriendSchema.statics.create = function (payload) {
  // this === Model
  const userFriend = new this(payload);
  // return Promise
  return userFriend.save();
};

// Create Model & Export
module.exports = mongoose.model('user_friend', userFriendSchema);