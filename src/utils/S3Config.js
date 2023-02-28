const s3 = require('aws-sdk/clients/s3')

const S3 = new s3

S3.config.update({
  secretAccessKey: process.env.S3_SECRET_KEY,
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  region: process.env.S3_REGION
})

// Upload file
const uploadToS3 = async (file, key) => {
  const fileName = file[0].filename.replace(/[^a-zA-Z0-9.]/g, '')
  const uniqFileName = `${Date.now()}-${fileName}`,
    fileDirPath = `${key}/${uniqFileName}`

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileDirPath,
      Body: file[0].data,
      ContentType: file[0].mimetype,
      ACL: 'public-read'
    }

    // Upload file to S3
    const upload = await S3.upload(params).promise()

    // Return file url
    return { link: upload.Location }
}

module.exports = {
  S3,
  uploadToS3
}
