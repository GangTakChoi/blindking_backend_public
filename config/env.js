const dotenv = require('dotenv')
const path = require('path')

let envPath
let stage = process.argv[2] === undefined ? 'dev' : process.argv[2]

if (stage === 'prod') {
  envPath = path.join(__dirname, '.env.prod')
} else if (stage === 'staging') {
  envPath = path.join(__dirname, '.env.staging')
} else if (stage === 'dev') {
  envPath = path.join(__dirname, '.env.dev')
} else {
  stage = 'dev'
  envPath = path.join(__dirname, '.env.dev')
}

console.log('['+ stage +' mode]')

dotenv.config({
  path: envPath
})

