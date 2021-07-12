const mongoose = require('mongoose');

const messageRecordSchema = mongoose.Schema({
  userObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true }, // 대기: wait, 거절: reject, 수락: accept, 차단: block
  created: { type: Date, default: Date.now },
})

// 회원 친구 정보
const chattingRoomSchema = new mongoose.Schema({
  messageRecords: [messageRecordSchema]
},
{
  timestamps: true
},
{
  collection: 'chatting_room'
}
);

// Create new users document
chattingRoomSchema.statics.create = function () {
  // this === Model
  const userFriend = new this();
  // return Promise
  return userFriend.save();
};

// Create Model & Export
module.exports = mongoose.model('chatting_room', chattingRoomSchema);