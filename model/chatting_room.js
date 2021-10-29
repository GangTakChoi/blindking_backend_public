const mongoose = require('mongoose');

const messageUnReadInfo = mongoose.Schema({
  userObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isUnReadMessage: { type: Boolean, default: false, required: true },
})

const messageRecordSchema = mongoose.Schema({
  userObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userNickname: { type: String, required: true },
  content: { type: String, required: true },
  created: { type: Date, default: Date.now },
})

// 회원 친구 정보
const chattingRoomSchema = new mongoose.Schema({
  messageRecords: [messageRecordSchema],
  messageUnReadInfos: [messageUnReadInfo],
  isClose: {type: Boolean, default: false, required: true }, 
},
{
  timestamps: true,
  versionKey: false 
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