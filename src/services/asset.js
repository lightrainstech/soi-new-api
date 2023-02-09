const pinataSDK = require('@pinata/sdk')
const fs = require('fs')
const { pipeline, Duplex } = require('stream')

const UserToken = require('../models/userToken')
const assetPayload = require('../payload/assetPayload')

const pinata = new pinataSDK(process.env.PINATA_API, process.env.PINATA_SECRET)

const { createThumbnailAndPushToS3 } = require('../utils/thumbnail')

const {
  addProfile,
  errorMessage,
  getProfileDetails,
  getAccountType,
  removeProfile,
  getProfileNotExistError
} = require('../utils/soi')

const fileDir = `./public/assets`
if (!fs.existsSync(fileDir)) {
  fs.mkdirSync(fileDir, { recursive: true })
}

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
        const { file } = request.body
        if (!Array.isArray(file) || !file[0].filename) {
          reply.error({
            statusCode: 422,
            message: 'Upload Failed. Please select a valid file.'
          })
          return reply
        }

        const filePath = `${process.cwd()}/public/assets/${Date.now()}${
          file[0].filename
        }`
        const readStream = Duplex()
        readStream.push(file[0].data)
        readStream.push(null)
        pipeline(readStream, fs.createWriteStream(filePath), async err => {
          if (err) {
            console.log(err)
            reply.error({ message: 'Upload failed', error: err.message })
          }
          const readableStreamForFile = fs.createReadStream(filePath),
            { IpfsHash } = await pinata.pinFileToIPFS(readableStreamForFile, {
              pinataMetadata: {
                name: file[0].filename
              }
            })

          // Create thumbnail and get S3 link
          const { link } = await createThumbnailAndPushToS3(filePath, file)

          // Remove file from disk storage
          fs.unlinkSync(filePath)

          let assetUrl = 'https://ipfs.io/ipfs/' + IpfsHash
          reply.success({
            path: assetUrl,
            mimeType: file[0].mimetype,
            thumbnail: link
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
      const { assetUrl, thumbnail } = request.body,
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
        const job = await fastify.bull.sendNFT.add(
          {
            userId: userId,
            affCode: affCode,
            wallet: wallet,
            metaDataUrl: metaDataUrl,
            assetUrl: assetUrl,
            thumbnail: thumbnail
          },
          { removeOnComplete: true, removeOnFail: false, backoff: 10000 }
        )
        let count = await redis.get(`NFTC:${affCode}`)
        count = Number(count) - 1
        await redis.set(`NFTC:${affCode}`, Number(count))
        return reply.success({
          message: 'NFT minting initiated.',
          jobId: job.id
        })
      } catch (err) {
        console.log(err)
        reply.error({ message: 'Failed to mint asset.', error: err.message })
        return reply
      }
    }
  )

  // List user assets
  fastify.get(
    '/',
    {
      schema: assetPayload.getUserTokenSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        const userTokenModel = new UserToken()
        const { userId } = request.user,
          { page } = request.query,
          userTokens = await userTokenModel.listUserTokens(userId, page)
        if (!userTokens.length) {
          reply.code(404).error({
            message: 'No tokens found.'
          })
          return reply
        }
        reply.success({
          message: 'NFTs listed successfully.',
          nfts: userTokens
        })
        return reply
      } catch (error) {
        console.log(error)
        reply.error({ message: `Something went wrong: ${error}` })
      }
    }
  )
  // Check minting completed or not
  fastify.get(
    '/job/:jobId',
    {
      schema: assetPayload.checkJobStatusSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      const { jobId } = request.params
      try {
        const jobData = await fastify.bull.sendNFT,
          job = await jobData.getJob(jobId)
        if ((job && job.finishedOn) || !job) {
          reply.success({
            message: `Job has completed.`,
            isMintingCompleted: true
          })
          return reply
        } else {
          reply.success({
            message: `Job has not completed.`,
            isMintingCompleted: false
          })
        }
      } catch (error) {
        console.log(error)
        reply.error({
          message: error
        })
        return reply
      }
    }
  )
  // Link social profile to nft
  fastify.put(
    '/:nftId/social/profile',
    {
      schema: assetPayload.addSocialProfileSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        const userTokenModel = new UserToken(),
          { socialProfile, type } = request.body,
          { userId } = request.user,
          { nftId } = request.params

        // Check NFT exists or not
        const nft = await userTokenModel.getUserTokenById(nftId, userId)
        if (!nft) {
          reply.code(404).error({
            message: 'Asset not found.'
          })
          return reply
        }

        // Remove redis cache
        const key = `FOLLOWERC:${userId}`,
          cachedData = await fastify.redis.get(key)
        if (cachedData) {
          await fastify.redis.del(key)
        }

        // Check profile exists in db or not
        const isSocialProfileExists =
          await userTokenModel.checkSocialAccountExists(socialProfile)
        if (isSocialProfileExists) {
          reply.code(400).error({
            message: `${type} profile already exists.`
          })
          return reply
        }

        // Add profile to social insider
        const resData = {},
          result = await addProfile(socialProfile, type)

        if (result.error) {
          let err = await errorMessage(type)
          reply.code(400).error({
            message: err ? err : result.error.message
          })
          return reply
        }

        resData.id = result.resp.id
        resData.name = result.resp.name

        // Get followers count
        const profileData = await getProfileDetails(
          resData.id,
          getAccountType(type),
          type
        )
        resData.followers = profileData[type]

        // Add social account of a user to db
        const addSocialAccounts = await userTokenModel.updateSocialAccounts(
          nftId,
          socialProfile,
          resData
        )
        if (!addSocialAccounts) {
          reply.code(400).error({
            message: `Failed to add ${type} profile.`
          })
          return reply
        } else {
          reply.success({
            message: `${type} profile added successfully.`,
            nft: addSocialAccounts
          })
          return reply
        }
      } catch (err) {
        console.log(err)
        reply.error({
          message: `Failed to add ${type} profile.`,
          error: err.message
        })
        return reply
      }
    }
  )
  // Remove social accounts linked from nft
  fastify.put(
    '/:nftId/social/profile/remove',
    {
      schema: assetPayload.removeSocialProfileSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        const userTokenModel = new UserToken(),
          { socialProfile, type } = request.body,
          { userId } = request.user,
          { nftId } = request.params

        // Check NFT exists or not
        const nft = await userTokenModel.getUserTokenById(nftId, userId)
        if (!nft) {
          reply.code(404).error({
            message: 'Asset not found.'
          })
          return reply
        }

        // Check profile exists in db or not
        const isSocialProfileExists =
          await userTokenModel.checkSocialAccountExists(socialProfile)

        if (!isSocialProfileExists) {
          reply.code(404).error({
            message: 'Profile not found.'
          })
          return reply
        }

        const socialKeys = Object.keys(isSocialProfileExists.social).filter(
          key => isSocialProfileExists.social[key].socialInsiderId !== undefined
        )

        if (Object.keys(socialKeys).length == 2) {
          reply.error({
            message: 'At least two profile is required.'
          })
          return reply
        }

        // Remove profile from social insider
        const result = await removeProfile(
          isSocialProfileExists.social[type].socialInsiderId,
          type
        )
        if (
          result.resp === 'success' ||
          (isSocialProfileExists &&
            result.error.message === getProfileNotExistError(type))
        ) {
          // Remove profile from db
          const removeProfileFromDb = await userTokenModel.removeAccount(
            socialProfile,
            userId,
            nftId
          )
          //Remove redis cache
          const key = `FOLLOWERC:${userId}`,
            cachedData = await fastify.redis.get(key)
          if (cachedData) {
            await fastify.redis.del(key)
          }
          if (removeProfileFromDb) {
            reply.success({
              message: `${type} profile removed successfully.`,
              nft: removeProfileFromDb
            })
            return reply
          }
        } else {
          reply.error({
            message: `Failed to remove ${type} profile. Please try again.`
          })
          return reply
        }
      } catch (err) {
        console.log(err)
        reply.error({
          message: `Failed to remove ${type} profile. Please try again.`,
          error: err.message
        })
        return reply
      }
    }
  )
  // Get profile details from social insider
  fastify.get(
    '/social/details',
    {
      schema: assetPayload.checkFollowersCountSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        const userTokenModel = new UserToken(),
          { userId } = request.user,
          nfts = await userTokenModel.listTokens(userId)

        if (!nfts.length) {
          reply.code(404).error({
            message: 'Assets not found.'
          })
          return reply
        }

        // Check for cached value
        const key = `FOLLOWERC:${userId}`
        const cachedData = await fastify.redis.get(key)
        if (cachedData) {
          reply.success({
            isCache: true,
            profileDetails: JSON.parse(cachedData)
          })
          return reply
        }

        let resArray = []
        const updatePromises = nfts.map(async nft => {
          const socialKeys = Object.keys(nft.social).filter(
              key => nft.social[key].socialInsiderId !== undefined
            ),
            profileDetailsPromises = socialKeys.map(async key => {
              return getProfileDetails(
                nft.social[key].socialInsiderId,
                getAccountType(key),
                key
              )
            })
          const profileDetails = await Promise.all(profileDetailsPromises)
          if (profileDetails) {
            // Update followers count in db
            const updateFollowerPromises = socialKeys.map(async key => {
              let followerData = profileDetails.find(obj => obj[key]),
                value = followerData ? followerData[key] : 0,
                k = `social.${key}.followers`
              const update = await userTokenModel.updateFollowers(
                nft.nftId,
                k,
                value
              )
              if (update) {
                const foundObject = resArray.find(obj => key in obj)
                if (foundObject) {
                  const index = resArray.indexOf(foundObject)
                  resArray[index] = Object.assign({}, foundObject, {
                    [key]: foundObject[key] + update.social[key].followers
                  })
                } else {
                  resArray.push({ [key]: update.social[key].followers })
                }
              }
            })
            await Promise.all(updateFollowerPromises)
          }
        })
        await Promise.all(updatePromises)
        //Cache response in redis
        await fastify.redis.set(
          key,
          JSON.stringify(resArray),
          'EX',
          process.env?.CACHE_EXPIRY || 10800
        )
        reply.success({
          isCache: false,
          profileDetails: resArray
        })
        return reply
      } catch (error) {
        console.log(error)
        reply.error({ message: `Something went wrong: ${error}` })
        return reply
      }
    }
  )
}

module.exports.autoPrefix = '/assets'
