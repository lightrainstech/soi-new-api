'use strict'

const ethUtil = require('ethereumjs-util')
const omitEmpty = require('omit-empty')

const User = require('../models/userModel.js')
const UserToken = require('../models/userToken')
const userPayload = require('../payload/userPayload.js')
const Affiliate = require('../models/affiliateModel.js')

const { checkSumAddress } = require('../utils/contract')
const {
  addProfile,
  errorMessage,
  getProfileDetails,
  getAccountType,
  removeProfile
} = require('../utils/soi')
const S3 = require('../utils/S3Config')

const EXPIRESIN = process.env.JWT_TOKEN_EXPIRY || '3d'

module.exports = async function (fastify, opts) {
  let { redis } = fastify

  // Check username exists or not
  fastify.get(
    '/username/check',
    { schema: userPayload.checkUsernameSchema },
    async function (request, reply) {
      try {
        const userModel = new User(),
          { userName } = request.query,
          user = await userModel.getUserByUsername(userName)
        if (user) {
          reply.code(400).error({
            message: 'Username already exists.'
          })
          return reply
        } else {
          reply.success({
            message: 'Username is available.'
          })
          return reply
        }
      } catch (error) {
        console.log(error)
        reply.error({ message: `Something went wrong: ${error}` })
        return reply
      }
    }
  )

  // Check email exists or not
  fastify.get(
    '/:email/check',
    { schema: userPayload.checkEmailSchema },
    async function (request, reply) {
      try {
        const userModel = new User(),
          { email } = request.params,
          user = await userModel.getUserByEmail(email.toString().toLowerCase())
        if (user) {
          reply.code(400).error({
            message: 'Email already exists.'
          })
          return reply
        } else {
          reply.success({
            message: 'Email is available.'
          })
          return reply
        }
      } catch (error) {
        console.log(error)
        reply.error({ message: `Something went wrong: ${error}` })
        return reply
      }
    }
  )

  // User sign up
  fastify.post(
    '/signup',
    { schema: userPayload.signUpSchema },
    async function (request, reply) {
      const { phone, country, name, affCode, wallet, userName } = request.body,
        email = request.body.email.toString().toLowerCase()
      console.log('-----Args----', phone, country, name, affCode, wallet)
      try {
        const userModel = new User(),
          checkSumWallet = await checkSumAddress(wallet)
        // Check user exists or not
        const user = await userModel.getUserBywallet(checkSumWallet)
        if (user === null || !user) {
          userModel.name = name
          userModel.userName = userName
          userModel.phone = phone
          userModel.email = email
          userModel.country = country
          userModel.wallet = checkSumWallet

          if (affCode) {
            userModel.role = 'influencer'
          }
          const newUsr = await userModel.save()
          console.log('newUsr', newUsr)

          if (affCode) {
            Affiliate.create({
              user: newUsr._id,
              affiliateCode: affCode
            })
          }
          const jwt = fastify.jwt.sign(
            {
              userId: newUsr._id,
              name: newUsr.name,
              wallet: newUsr.wallet,
              affCode: affCode ? affCode : ''
            },
            { expiresIn: EXPIRESIN }
          )
          let respUser = {
            userId: newUsr._id,
            name: newUsr.name,
            userName: newUsr.userName,
            affCode: affCode ? affCode : '',
            accessToken: jwt
          }
          reply.success({ message: 'Sign up successful', respUser })
        }
      } catch (error) {
        console.log(error)
        reply.error({ message: `Something went wrong: ${error}` })
      }
    }
  )
  // Get logged in user details
  fastify.get(
    '/me',
    { schema: userPayload.getMeSchema, onRequest: [fastify.authenticate] },
    async function (request, reply) {
      try {
        const userModel = new User(),
          { userId } = request.user,
          user = await userModel.getUserById(userId)
        if (!user) {
          reply.code(404).error({
            message: 'User not found'
          })
          return reply
        }
        reply.success({
          message: 'User details',
          user: user
        })
        return reply
      } catch (error) {
        console.log(error)
        reply.error({ message: `Something went wrong: ${error}` })
      }
    }
  )

  // Get available nft details
  fastify.get(
    '/availableNft',
    { schema: userPayload.nftAvailableSchema },
    async function (request, reply) {
      const { affCode } = request.query
      try {
        console.log('affCode', affCode)
        const userModel = new User(),
          isExists = await userModel.checkAffiliateCode(affCode)
        if (!isExists) {
          reply.code(400).error({
            message: 'Invalid affiliate code.'
          })
          return reply
        }
        let count = (await redis.get(`NFTC:${affCode}`)) || 0
        console.log('###', count)
        if (Number(count) === 0) {
          return reply.error({
            message: 'Invalid agency code.'
          })
        }
        reply.success({
          message: 'Remaining NFts',
          data: Number(count)
        })
      } catch (error) {
        reply.error({
          message: error
        })
      }
      return reply
    }
  ),
    // Wallet signature verification
    fastify.post(
      '/walletConnect',
      { schema: userPayload.walletConnectSchema },
      async function (request, reply) {
        const { wallet, signature, message } = request.body,
          userModel = new User(),
          msgBuffer = Buffer.from(message),
          msgHash = ethUtil.hashPersonalMessage(msgBuffer),
          signatureBuffer = ethUtil.toBuffer(signature),
          signatureParams = ethUtil.fromRpcSig(signatureBuffer),
          publicKey = ethUtil.ecrecover(
            msgHash,
            signatureParams.v,
            signatureParams.r,
            signatureParams.s
          ),
          addressBuffer = ethUtil.publicToAddress(publicKey),
          address = ethUtil.bufferToHex(addressBuffer),
          checkSumAdd = await checkSumAddress(address),
          checkSumWallet = await checkSumAddress(wallet)
        if (checkSumAdd === checkSumWallet) {
          let userData = await userModel.getUserBywallet(checkSumWallet)
          if (userData) {
            const affiliateModel = new Affiliate(),
              affiliateData = await affiliateModel.getUserById(userData._id),
              jwt = fastify.jwt.sign(
                {
                  userId: userData._id,
                  name: userData.name,
                  wallet: userData.wallet,
                  affCode: affiliateData.affiliateCode
                },
                { expiresIn: EXPIRESIN }
              )
            let respUser = {
              userId: userData._id,
              name: userData.name,
              wallet: userData.wallet,
              accessToken: jwt
            }

            reply.success({
              isUserExist: true,
              respUser
            })
          } else {
            reply.success({
              isUserExist: false
            })
          }
        } else {
          reply.error({
            message: 'Invalid signature',
            data: { isUserExist: false }
          })
        }
      }
    )

  // Add social accounts
  fastify.put(
    '/social/profile',
    {
      schema: userPayload.addSocialProfileSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        const userModel = new User(),
          { socialProfile, type } = request.body,
          { wallet, userId } = request.user

        // Check user exists or not
        const user = await userModel.getUserBywallet(wallet)
        if (!user) {
          reply.code(404).error({
            message: 'User not found'
          })
          return reply
        }

        // Remove redis cache
        const key = `${userId}_social_profile_data`,
          cachedData = await fastify.redis.get(key)
        if (cachedData) {
          await fastify.redis.del(key)
        }

        // Check profile exists in db or not
        const isSocialProfileExists = await userModel.checkSocialAccountExists(
          socialProfile
        )
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
        const addSocialAccounts = await userModel.updateSocialAccounts(
          wallet,
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
            user: addSocialAccounts
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

  // Update avatar
  fastify.patch(
    '/avatar',
    {
      schema: userPayload.updateAvatar,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      const { avatar } = request.body,
        { wallet } = request.user,
        { isBanner } = request.query
      try {
        // Check user exists or not
        const userModel = new User(),
          user = await userModel.getUserBywallet(wallet)
        if (!user) {
          reply.code(404).error({
            message: 'User not found.'
          })
          return reply
        }
        if (isBanner) {
          user.bannerImage = avatar
        } else {
          user.avatar = avatar
        }
        const updateAvatar = await user.save()
        if (updateAvatar) {
          reply.success({
            message: isBanner
              ? 'Banner updated successfully'
              : 'Avatar updated successfully.',
            user: updateAvatar
          })
          return reply
        } else {
          reply.error({
            message: 'Failed to update avatar. Please try again.'
          })
          return reply
        }
      } catch (err) {
        console.log(err)
        reply.error({ message: 'Failed to update avatar.', error: err.message })
        return reply
      }
    }
  )

  // Check user has already minted the nft or not
  fastify.get(
    '/mint/status',
    {
      schema: userPayload.checkIsMintedStatusSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      const { userId, affCode } = request.user
      try {
        const userTokenModel = new UserToken(),
          userModel = new User(),
          user = await userModel.getUserById(userId)
        if (!user) {
          reply.code(404).error({
            message: 'User not found'
          })
          return reply
        }
        let count = (await redis.get(`NFTC:${affCode}`)) || 0,
          isMinted = await userTokenModel.getUserTokenByUserId(userId)
        if (!isMinted && Number(count) > 0) {
          reply.success({
            isEligibleToMint: true
          })
          return reply
        } else {
          reply.success({
            isEligibleToMint: false
          })
          return reply
        }
      } catch (error) {
        reply.error({
          message: error
        })
        return reply
      }
    }
  )

  // Get profile details from social insider
  fastify.get(
    '/social/details',
    {
      schema: userPayload.checkFollowersCountSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        const userModel = new User(),
          { userId } = request.user,
          user = await userModel.getUserById(userId)
        if (!user) {
          reply.code(404).error({
            message: 'User not found.'
          })
          return reply
        }

        // get data from redis cache
        const key = `${userId}_social_profile_data`,
          cachedData = await fastify.redis.get(key)
        if (cachedData) {
          reply.success({
            profileDetails: JSON.parse(cachedData)
          })
          return reply
        } else {
          // Get social profile details from social insider
          const socialKeys = Object.keys(user.social).filter(
              key => user.social[key].socialInsiderId !== undefined
            ),
            profileDetailsPromises = socialKeys.map(async key => {
              return getProfileDetails(
                user.social[key].socialInsiderId,
                getAccountType(key),
                key
              )
            })
          // Get followers count
          const profileDetails = await Promise.all(profileDetailsPromises)
          if (profileDetails) {
            // Cache response in redis
            await fastify.redis.set(
              key,
              JSON.stringify(profileDetails),
              'EX',
              process.env?.CACHE_EXPIRY || 10800
            )
            // Update followers count in db
            const updatePromises = socialKeys.map(async key => {
              let followerData = profileDetails.find(obj => obj[key])
              let value = followerData ? followerData[key] : 0
              const updateData = {
                [`social.${key}.followers`]: value
              }
              await userModel.updateFollowers(userId, updateData)
            })
            await Promise.all(updatePromises)
            reply.success({
              profileDetails
            })
            return reply
          } else {
            reply.error({
              message: 'Failed to fetch profile details. Please try again.'
            })
            return reply
          }
        }
      } catch (error) {
        console.log(error)
        reply.error({ message: `Something went wrong: ${error}` })
        return reply
      }
    }
  )
  // Update user profile
  fastify.put(
    '/profile',
    {
      schema: userPayload.updateProfileSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        const userModel = new User(),
          { userId } = request.user,
          user = await userModel.getUserById(userId)
        if (!user) {
          reply.code(404).error({
            message: 'User not found.'
          })
          return reply
        }
        let updateObj = {
            name: request.body.name,
            country: request.body.country,
            phone: request.body.phone
          },
          cleanObj = omitEmpty(updateObj)
        let result = await userModel.updateProfile(userId, cleanObj)
        if (result) {
          reply.success({
            message: 'Profile updated successfully',
            user: result
          })
          return reply
        } else {
          reply.error({ message: 'Failed to update profile.' })
          return reply
        }
      } catch (error) {
        console.log(error)
        reply.error({ message: `Something went wrong: ${error}` })
        return reply
      }
    }
  )
  // Remove social accounts
  fastify.put(
    '/social/profile/remove',
    {
      schema: userPayload.removeSocialProfileSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        const userModel = new User()
        let { socialProfile, type } = request.body,
          { wallet, userId } = request.user

        // Check user exists or not
        const user = await userModel.getUserBywallet(wallet)
        if (!user) {
          reply.code(404).error({
            message: 'User not found.'
          })
          return reply
        }

        // Check profile exists in db or not
        const isSocialProfileExists = await userModel.checkSocialAccountExists(
          socialProfile
        )

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
        if (result.resp === 'success') {
          // Remove profile from db
          const removeProfileFromDb = await userModel.removeAccount(
            socialProfile,
            userId
          )
          // Remove redis cache
          const key = `${userId}_social_profile_data`,
            cachedData = await fastify.redis.get(key)
          if (cachedData) {
            await fastify.redis.del(key)
          }
          if (removeProfileFromDb) {
            reply.success({
              message: `${type} profile removed successfully.`,
              user: removeProfileFromDb
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
  // Verify S3 signature
  fastify.post(
    '/profile/verify-signature',
    {
      schema: userPayload.s3SignatureVerificationSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        let { fileName, fileType } = request.body,
          { userId } = request.user,
          { isBanner } = request.query,
          userModel = new User(),
          user = await userModel.getUserById(userId)
        if (!user) {
          reply.code(404).error({
            message: 'User not found'
          })
          return reply
        }

        function getPath(image) {
          return image.split('/').slice(-2).join('/')
        }

        let pathToDelete =
          isBanner && user.bannerImage
            ? getPath(user.bannerImage)
            : !isBanner && user.avatar
            ? getPath(user.bannerImage)
            : undefined

        if (pathToDelete) {
          // Delete current image
          await S3.deleteObject({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: pathToDelete
          }).promise()
        }

        fileName = fileName.replace(/[^a-zA-Z0-9.]/g, '')
        const uniqFileName = `${Date.now()}-${fileName}`,
          fileDirPath = `${userId}/${uniqFileName}`

        const s3Params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: fileDirPath,
          Expires: 60 * 3,
          ContentType: fileType,
          ACL: 'public-read'
        }

        // Generate signed url
        await S3.getSignedUrl('putObject', s3Params, (err, data) => {
          if (err) {
            reply.error({ message: err })
          }
          reply.success({
            signedRequest: data,
            url: `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${fileDirPath}`,
            uniqFileName: uniqFileName,
            fileDirPath: fileDirPath
          })
        })
        return reply
      } catch (error) {
        console.log(error)
        reply.error({
          message: `Failed to verify signature. Please try again. - ${error}`
        })
        return reply
      }
    }
  )
}

module.exports.autoPrefix = '/user'
