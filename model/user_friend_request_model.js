const mongoose = require('mongoose');

// 회원 친구 요청 정보
const userFriendRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true },
  receiveId: { type: String, required: true },
  status: {type: String, required: true, enum: ['wait', 'reject', 'accept', 'block']} // 대기: wait, 거절: reject, 수락: accept, 차단: block
},
{
  timestamps: true
},
{
  collection: 'user_friend_request'
}
);

userFriendRequestSchema.index({ requestId: 1, receiveId: 1}, { unique: true });

// Create new users document
userFriendRequestSchema.statics.create = function (payload) {
  // this === Model
  const userFriendRequest = new this(payload);
  // return Promise
  return userFriendRequest.save();
};

userFriendRequestSchema.statics.findOneByRequestId = function (requestId) {
  let filter = {
    "requestId" : requestId
  }
  return this.find(filter);
};

// Create Model & Export
module.exports = mongoose.model('user_friend_request', userFriendRequestSchema);