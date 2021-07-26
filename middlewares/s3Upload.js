const multer = require('multer')
const multerS3 = require('multer-s3')
const AWS = require('aws-sdk')
const dotenv = require('dotenv')
const fileLimitSizeMB = 1.5 // 파일 크기 제한 (단위: MB)

dotenv.config()

AWS.config.update({
  accessKeyId: process.env.AWS_S3_UPLOAD_ACCESS_KEY,
  secretAccessKey: process.env.AWS_S3_UPLOAD_SECRET_KEY,
  region : process.env.AWS_S3_UPLOAD_REGION
});

const S3 = new AWS.S3()

var upload = multer({
  storage: multerS3({
    s3: S3,
    bucket: "image.choikt.com", // 버킷 이름
    contentType: multerS3.AUTO_CONTENT_TYPE, // 자동을 콘텐츠 타입 세팅
    acl: 'public-read', // 클라이언트에서 자유롭게 가용하기 위함
    key: (req, file, cb) => {
      let filename = Date.now() + '.' + file.originalname
      cb(null, filename)
    },
    limits: { fileSize: 1024 * 1024 * fileLimitSizeMB } // 최대 1.5MB
  }),

});

module.exports = upload