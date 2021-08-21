const mongoose = require('mongoose');

const questioinListSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    content: { type: String, required: true },
    isShow: { type: Boolean, required: true, default: true },
    isDelete: { type: Boolean, required: true, default: false },
  },
  {
    versionKey: false,
    timestamps: true,
  },
  {
    collection: 'question_list'
  }
);

questioinListSchema.statics.createOrSave = function (payload) {
  // this === Model
  const questionInfo = new this(payload);
  // return Promise
  return questionInfo.save();
};

// Create Model & Export
module.exports = mongoose.model('question_list', questioinListSchema);