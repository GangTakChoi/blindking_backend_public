const mongoose = require('mongoose');

const commonSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    data: { type: Array, required: true },
  },
  {
    collection: 'commons'
  }
);

commonSchema.statics.createOrSave = function (payload) {
  // this === Model
  const commonInfo = new this(payload);
  // return Promise
  return commonInfo.save();
};

// Create Model & Export
module.exports = mongoose.model('commons', commonSchema);