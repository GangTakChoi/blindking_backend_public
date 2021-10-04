const mongoose = require('mongoose');

// 게시판 카테고리
const boardCategorySchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ["normal", "admin"] },
  name: { type: String, required: true, unique: true },
  order: { type: Number, default: 0, required: true },
  isDelete: {type: Boolean, default: false, required: true }
},
{
  versionKey: false,
  timestamps: true
},
{
  collection: 'board_category'
}
);

boardCategorySchema.statics.createOrSave = function (payload) {
  // this === Model
  const boardCategory = new this(payload);
  // return Promise
  return boardCategory.save();
};

// Create Model & Export
module.exports = mongoose.model('board_category', boardCategorySchema);