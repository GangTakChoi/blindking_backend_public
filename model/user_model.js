const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const friendSchema = Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  status: { type: String, required: true, enum: ['wait', 'reject', 'accept', 'block']} // 대기: wait, 거절: reject, 수락: accept, 차단: block
})

// Define Schemes
const usersSchema = Schema({
  id: { type: String, required: true, unique: true },
  pw: { type: String, required: true },
  nickname: { type: String, required: true, unique: true },
  gender: { type: Boolean, required: true, default: true }, // true : 남성, false : 여성
  birthYear: { type: Number, required: false, default: 0 },
  mbti: { type: String, required: false, default: '' },
  question1: { type: String, required: false, default: '' },
  question2: { type: String, required: false, default: '' },
  question3: { type: String, required: false, default: '' },
  question4: { type: String, required: false, default: '' },
  question5: { type: String, required: false, default: '' },
  question6: { type: String, required: false, default: '' },
  question7: { type: String, required: false, default: '' },
  friends: [friendSchema],
},
{
  timestamps: true
},
{
  collection: 'User'
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

// usersSchema.statics.findOne = function (filter) {
//   return this.findOne(filter);
// };

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