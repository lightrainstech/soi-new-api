const sharp = require('sharp')
const S3 = require('./S3Config')

exports.createThumbnailAndPushToS3 = async (filePath, formData) => {
  // Resize image to thumbnail size
  const thumbnail = await sharp(filePath).resize(200, 200).toBuffer()
  fileDir = `assets/thumbnail-${formData.file[0].filename}`

  // Set up S3 parameters for upload
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileDir,
    Body: thumbnail,
    ContentType: formData.file[0].mimetype,
    ACL: 'public-read'
  }

  // Upload thumbnail to S3
  const upload = await S3.upload(params).promise()

  // Return S3 link to thumbnail
  return { link: upload.Location }
}
