const mongoose = require('mongoose');

// 유저 신고
const userReportSchema = new mongoose.Schema({
  target: { type: String, required: true, enum: ["채팅", "게시글", "댓글"] },
  type: { type: String, required: true },
  reporterUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reporterNickname: { type: String, required: true },
  reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedUserNickname: { type: String, required: true },
  reportContent: { type: String, default: '', required: true },
  captureTargetContent: { type: Object, required: false },
  adminComment: { type: String, default: '', required: false },
  isComplete: { type: Boolean, default: false, required: true },
  isDelete: { type: Boolean, default: false, required: true },
},
{
  versionKey: false,
  timestamps: true
},
{
  collection: 'user_report'
}
);

userReportSchema.index({ target: 'text', type: 'text', reporterNickname: 'text',reportedUserNickname: 'text' })

userReportSchema.statics.createOrSave = function (payload) {
  // this === Model
  const userReport = new this(payload);
  // return Promise
  return userReport.save();
};

// Create Model & Export
module.exports = mongoose.model('user_report', userReportSchema);