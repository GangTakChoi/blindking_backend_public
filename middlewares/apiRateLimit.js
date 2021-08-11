const RateLimit = require('express-rate-limit')


// 게시판 추천/비추천 요청 간격 제한
exports.apiBoardLikeLimiter = new RateLimit({
  windowMs: 1*1000, // 1초
  max: 1, // 최대 횟수
  handler(req, res) { // 어겼을 경우 메시지
    res.status(400).json({
      code: 400,
      message: 'Too many request'
    })
  }
})

// 전체 요청 간격 제한 (dos 공격 방어)
exports.apiCommonLimiter = new RateLimit({
  windowMs: 1*1000, // 1초
  max: 3, // 최대 횟수
  handler(req, res) { // 어겼을 경우 메시지
    res.status(400).json({
      code: 400,
      message: 'Too many request'
    })
  }
})