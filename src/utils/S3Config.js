const s3 = require('aws-sdk/clients/s3')

const S3 = new s3

S3.config.update({
  secretAccessKey: process.env.S3_SECRET_KEY,
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  region: process.env.S3_REGION
})

module.exports = S3
