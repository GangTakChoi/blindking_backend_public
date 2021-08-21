const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const questionInfo = mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'question_list', required: true },
  answer: { type: String, default: '', maxLength: 20 }
},
{
  _id : false
}
)

const regionInfoSchema = mongoose.Schema({
  rootAreaCode: { type: String, index : true, default: '' },
  subAreaCode: { type: String, index : true, default: '' },
},
{
  _id : false
}
)

// Define Schemes
const usersSchema = Schema({
  id: { type: String, required: true, unique: true },
  pw: { type: String, required: true },
  nickname: { type: String, required: true, unique: true },
  gender: { type: Boolean, required: true, default: true }, // true : 남성, false : 여성
  birthYear: { type: Number, required: false, default: 0 },
  mbti: { type: String, required: false, enum: ["ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP", "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ", "unkown"], default: 'unkown' },
  isActiveMatching: { type: Boolean, required: true, default: false },
  questionList: [questionInfo],
  region: regionInfoSchema,
},
{
  timestamps: true,
  versionKey: false 
},
{
  collection: 'user'
}
);

// Create new users document
usersSchema.statics.create = function (payload) {
  // this === Model
  const user = new this(payload);
  // return Promise
  return user.save();
};

// Find All
usersSchema.statics.findAll = function (filter = {}) {
  // return promise
  // V4부터 exec() 필요없음
  return this.find(filter);
};

usersSchema.statics.findOneByIdPw = function (id, pw) {
  let filter = {
    id: id,
    pw: pw
  }
  return this.findOne( filter );
};

usersSchema.statics.findOneById = function (userId) {
  let filter = {
    'id': userId
  }
  return this.findOne( filter );
};

usersSchema.statics.findOneBy_Id = function (userId) {
  return this.findById( userId );
};

usersSchema.statics.updateById = function (userId, payload) {
  let filter = {
    'id': userId
  }
  // { new: true }: return the modified document rather than the original. defaults to false
  return this.findOneAndUpdate(filter, payload, { new: false });
};

usersSchema.statics.deleteById = function (userId) {
  let filter = {
    'id': userId
  }
  return this.remove(filter);
};

// Create Model & Export
module.exports = mongoose.model('User', usersSchema);