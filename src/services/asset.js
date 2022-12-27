const pinataSDK = require('@pinata/sdk')
const fs = require('fs')
const { pipeline, Duplex } = require('stream')

const assetPayload = require('../payload/assetPayload')

const pinata = new pinataSDK(process.env.PINATA_API, process.env.PINATA_SECRET)

module.exports = async function (fastify, opts) {
  let { redis } = fastify

  // Upload nft to pinata
  fastify.post(
    '/file/upload',
    {
      schema: assetPayload.uploadAssetSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        let pinataStatus = await pinata.testAuthentication()
        console.log('PinataStatus: ', pinataStatus)
        const formData = request.body
        if (typeof formData.file !== 'object') {
          reply.error({
            statusCode: 422,
            message: 'Failed. Asset should be a file.'
          })
          return reply
        }
        if (formData.file[0].filename == '') {
          reply.error({
            statusCode: 422,
            message:
              'Failed to upload. File name is null. Please upload a proper File.'
          })
          return reply
        }
        const fileDir = `./public/assets`
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true })
        }
        const filePath = `${process.cwd()}/public/assets/${Date.now()}${
          formData.file[0].filename
        }`
        const readStream = Duplex()
        readStream.push(formData.file[0].data)
        readStream.push(null)
        pipeline(readStream, fs.createWriteStream(filePath), async err => {
          if (err) {
            console.log(err)
            reply.error({ message: 'Upload failed', error: err.message })
          }
          const readableStreamForFile = fs.createReadStream(filePath),
            { IpfsHash } = await pinata.pinFileToIPFS(readableStreamForFile, {
              pinataMetadata: {
                name: formData.file[0].filename
              }
            })

          fs.unlinkSync(filePath)

          let assetUrl = 'https://ipfs.io/ipfs/' + IpfsHash
          reply.success({
            path: assetUrl,
            mimeType: formData.file[0].mimetype
          })
        })
      } catch (err) {
        console.log(err)
        reply.error({ message: 'Upload Failed', error: err.message })
      }
      return reply
    }
  )

  // Mint NFT
  fastify.post(
    '/mint',
    { schema: assetPayload.mintNftSchema, onRequest: [fastify.authenticate] },
    async function (request, reply) {
      const { assetUrl } = request.body,
        { wallet, affCode, userId } = request.user
      try {
        // Static title and description for assets
        const title = 'SOI',
          description = 'Sea Of Influencers'

        // Add meta data
        let metaData = {
          title,
          description,
          assetUrl
        }
        const options = {
          pinataMetadata: {
            name: title
          }
        }
        const pinataStatus = await pinata.testAuthentication(),
          result = await pinata.pinJSONToIPFS(metaData, options),
          metaDataUrl = 'https://gateway.pinata.cloud/ipfs/' + result.IpfsHash
        await fastify.bull.sendNFT.add(
          {
            userId: userId,
            affCode: affCode,
            wallet: wallet,
            metaDataUrl: metaDataUrl,
            assetUrl: assetUrl
          },
          { removeOnComplete: true, removeOnFail: false, backoff: 10000 }
        )
        let count = await redis.get(`NFTC:${affCode}`)
        count = Number(count) - 1
        await redis.set(`NFTC:${affCode}`, Number(count))
        return reply.success({
          message: 'NFT minting initiated.'
        })
      } catch (err) {
        console.log(err)
        reply.error({ message: 'Failed to mint asset.', error: err.message })
        return reply
      }
    }
  )
}


module.exports.autoPrefix = '/assets'
