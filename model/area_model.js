const mongoose = require('mongoose');

// 주소 정보
const addressSchema = new mongoose.Schema({
  depth: { type: Number, required: true },
  parentCode: { type: String },
  code: { type: String, required: true },
  name: { type: String, required: true },
},
{
  versionKey: false 
},
{
  collection: 'address_info'
}
);

addressSchema.statics.createOrSave = function (payload) {
  // this === Model
  const addressInfo = new this(payload);
  // return Promise
  return addressInfo.save();
};

// Create Model & Export
module.exports = mongoose.model('address_info', addressSchema);