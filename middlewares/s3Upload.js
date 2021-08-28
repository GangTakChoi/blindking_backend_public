const multer = require('multer')
const multerS3 = require('multer-s3')
const AWS = require('aws-sdk')
const jwt = require('jsonwebtoken');
const YOUR_SECRET_KEY = process.env.SECRET_KEY;
const fileLimitSizeMB = 1.5 // 파일 크기 제한 (단위: MB)


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
      const clientToken = req.cookies.token;
      const decoded = jwt.verify(clientToken, YOUR_SECRET_KEY);

      switch (file.mimetype) {
				case 'image/jpeg':
					mimeType = 'jpg';
					break;
				case 'image/png':
					mimeType = 'png';
					break;
				case 'image/gif':
					mimeType = 'gif';
					break;
				case 'image/bmp':
					mimeType = 'bmp';
					break;

        // 이미지 파일이 아닌 경우
				default:
          cb(new Error('이미지 파일이 아닙니다.'))
          return
			}

      let filename = decoded.nickname + '_' + Date.now() + '.' + mimeType
      cb(null, filename)
    },
  }),
  limits: { fileSize: 1024 * 1024 * fileLimitSizeMB }
});

module.exports = upload