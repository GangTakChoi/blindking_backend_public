const mongoose = require('mongoose');

// 회원 친구 정보
const userFriendSchema = new mongoose.Schema({
  id: { type: String, required: true },
  friendId: { type: String, required: true }
},
{
  timestamps: true
},
{
  collection: 'user_friends'
}
);

// Create new users document
userFriendSchema.statics.create = function (payload) {
  // this === Model
  const userFriend = new this(payload);
  // return Promise
  return userFriend.save();
};

// Create Model & Export
module.exports = mongoose.model('user_friends', userFriendSchema);