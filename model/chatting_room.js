const mongoose = require('mongoose');

const readedMessageCountInfo = mongoose.Schema({
  userObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  readedMessageCount: { type: Number, default: 0, required: true },
})

const messageRecordSchema = mongoose.Schema({
  userObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  created: { type: Date, default: Date.now },
})

// 회원 친구 정보
const chattingRoomSchema = new mongoose.Schema({
  messageRecords: [messageRecordSchema],
  readedMessageCountInfos: [readedMessageCountInfo]
},
{
  timestamps: true
},
{
  collection: 'chatting_room'
}
);

// Create new users document
chattingRoomSchema.statics.create = function (payload) {
  // this === Model
  const chattingRoom = new this(payload);
  // return Promise
  return chattingRoom.save();
};

// Create Model & Export
module.exports = mongoose.model('chatting_room', chattingRoomSchema);