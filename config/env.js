const dotenv = require('dotenv')
const path = require('path')

let envPath
let stage = process.argv[3] === undefined ? 'dev' : process.argv[3]

console.log('['+ stage +' mode]')

if (stage === 'prod') {
  envPath = path.join(__dirname, '.env.prod')
} else if (stage === 'staging') {
  envPath = path.join(__dirname, '.env.staging')
} else if (stage === 'dev') {
  envPath = path.join(__dirname, '.env.dev')
} else {
  envPath = path.join(__dirname, '.env.dev')
}

dotenv.config({
  path: envPath
})

