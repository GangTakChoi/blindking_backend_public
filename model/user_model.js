const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const questionInfo = mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'question_list', required: true },
  answer: { type: String, default: '' }
},
{
  _id : false
}
)

const regionInfoSchema = mongoose.Schema({
  rootAreaCode: { type: String, default: '' },
  rootAreaName: { type: String, default: '' },
  subAreaCode: { type: String, default: '' },
  subAreaName: { type: String, default: '' },
},
{
  _id : false
}
)

const activeStopHistory = mongoose.Schema({
  stopPrieod: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  adminComment: { type: String },
})

regionInfoSchema.index({rootAreaCode: 'text', subAreaCode: 'text'})

// Define Schemes
const usersSchema = Schema({
  id: { type: String, required: true, unique: true },
  pw: { type: String, required: true },
  nickname: { type: String, required: true, unique: true },
  gender: { type: String, required: true, enum: ['male', 'female'], default: 'male' },
  birthYear: { type: Number, required: false, default: 0 },
  mbti: { type: String, required: false, enum: ["ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP", "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ", ""], default: "" },
  isActiveMatching: { type: Boolean, required: true, default: false },
  matchingTopDisplayUseingTime: { type: Date, required: false, default: new Date(0) },
  questionAnswerInfoList : [questionInfo],
  activeStopPrieodLastDate: { type: Date, required: true, default: new Date(0) },
  activeStopHistoryList: [activeStopHistory],
  warningCount: { type: Number, default: 0 },
  region: regionInfoSchema,
  isDelete: { type: Boolean, required: true, default: false },
  roleName: { type: String, required: true, default: "user", enum: ["user", "admin"] },
},
{
  timestamps: true,
  versionKey: false 
},
{
  collection: 'user'
}
);

usersSchema.index({ matchingTopDisplayUseingTime: -1, mbti: 'text', gender: 'text', birthYear: 1, isDelete: 1 })

// Create new users document
usersSchema.statics.create = function (payload) {
  // this === Model
  const user = new this(payload);
  // return Promise
  return user.save();
};

usersSchema.statics.findOneByIdPw = function (id, pw) {
  let filter = {
    id: id,
    pw: pw
  }
  return this.findOne( filter );
};

usersSchema.statics.findOneBy_Id = function (userId) {
  return this.findById( userId );
};

// Create Model & Export
module.exports = mongoose.model('User', usersSchema);