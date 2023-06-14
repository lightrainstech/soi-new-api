'use strict'

const ethUtil = require('ethereumjs-util')
const omitEmpty = require('omit-empty')
const User = require('../models/userModel.js')
const UserToken = require('../models/userToken')
const userPayload = require('../payload/userPayload.js')
const Affiliate = require('../models/affiliateModel.js')
const Agency = require('../models/agencyModel')

const { checkSumAddress } = require('../utils/contract')
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
      try {
        return reply.code(503).send({
          message:
            'Sorry for the inconvenience caused. We are undergoing maintenance.'
        })
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
          user = await userModel.getUserProfileDetails(userId)
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
        const agencyModel = new Agency(),
          isExists = await agencyModel.checkAffiliateCode(affCode)
        if (!isExists) {
          reply.code(400).error({
            message: 'Invalid agency code.'
          })
          return reply
        }
        let count = (await redis.get(`NFTC:${affCode}`)) || 0
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
        console.log(error)
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
        return reply.code(503).send({
          message:
            'Sorry for the inconvenience caused. We are undergoing maintenance.'
        })
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
              affiliateData = await affiliateModel.getUserById(userData._id)
            if (!affiliateData) {
              return reply.code(400).error({
                message:
                  'You must need an influencer account. Contact admin for more information.'
              })
            }
            const jwt = fastify.jwt.sign(
              {
                userId: userData._id,
                name: userData.name,
                wallet: userData.wallet,
                affCode: affiliateData?.affiliateCode
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

  // Update avatar or banner image
  fastify.put(
    '/profile/avatar-or-banner',
    {
      schema: userPayload.updateAvatarOrBanner,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        let { file } = request.body,
          { userId } = request.user,
          { isBanner } = request.query
        if (!Array.isArray(file) || !file[0].filename) {
          reply.error({
            statusCode: 422,
            message: 'Upload Failed. Please select a valid file.'
          })
          return reply
        }
        const userModel = new User(),
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
            ? getPath(user.avatar)
            : undefined

        if (pathToDelete) {
          // Delete current image
          await S3.deleteObject({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: pathToDelete
          }).promise()
        }

        const fileName = file[0].filename.replace(/[^a-zA-Z0-9.]/g, '')
        const uniqFileName = `${Date.now()}-${fileName}`,
          fileDirPath = `${userId}/${uniqFileName}`

        // Set up S3 parameters for upload
        const params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: fileDirPath,
          Body: file[0].data,
          ContentType: file[0].mimetype,
          ACL: 'public-read'
        }
        // Upload thumbnail to S3
        const upload = await S3.upload(params).promise()
        let updateObj = {}
        if (isBanner) {
          updateObj['bannerImage'] = upload.Location
        } else {
          updateObj['avatar'] = upload.Location
        }

        const update = await userModel.updateBannerOrAvatar(userId, updateObj)
        if (update) {
          return reply.success({
            message: isBanner
              ? 'Banner updated successfully.'
              : 'Avatar  updated successfully.',
            user: update
          })
        } else {
          reply.error({
            message: `Failed to verify signature. Please try again.`
          })
          return reply
        }
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
