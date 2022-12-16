'use strict'

const ethUtil = require('ethereumjs-util')
const fs = require('fs')
const { pipeline, Duplex } = require('stream')
const pinataSDK = require('@pinata/sdk')

const User = require('../models/userModel.js')
const userPayload = require('../payload/userPayload.js')
const Affiliate = require('../models/affiliateModel.js')

const { checkSumAddress } = require('../utils/contract')
const { addProfile, errorMessage } = require('../utils/soi')

const EXPIRESIN = process.env.JWT_TOKEN_EXPIRY || '3d'

const pinata = new pinataSDK(process.env.PINATA_API, process.env.PINATA_SECRET)

const userModel = new User()

module.exports = async function (fastify, opts) {
  let { redis } = fastify

  // User sign up
  fastify.post(
    '/signup',
    { schema: userPayload.signUpSchema },
    async function (request, reply) {
      const { phone, country, name, affCode, wallet, userName } = request.body,
        email = request.body.email.toString().toLowerCase()
      console.log('-----Args----', phone, country, name, affCode, wallet)
      try {
        // Check email or userName is unique or not
        const user = await userModel.getUserByUserNameOrEmail(userName, email)
        if (user !== null && user.userName === userName) {
          reply.error({ message: 'User with this user name already exists.' })
          return reply
        }
        if (user !== null && user.email === email) {
          reply.error({ message: 'User with this email already exists.' })
          return reply
        }
        if (user === null) {
          userModel.name = name
          userModel.userName = userName
          userModel.phone = phone
          userModel.email = email
          userModel.country = country
          userModel.wallet = await checkSumAddress(wallet)

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
        const { userId } = request.user,
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
        let count = (await redis.get(`NFTC:${affCode}`)) || 0
        console.log('###', count)
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
          userModel = new User()
        console.log(wallet, signature)
        const msgBuffer = Buffer.from(message)
        const msgHash = ethUtil.hashPersonalMessage(msgBuffer)
        const signatureBuffer = ethUtil.toBuffer(signature)
        const signatureParams = ethUtil.fromRpcSig(signatureBuffer)
        const publicKey = ethUtil.ecrecover(
          msgHash,
          signatureParams.v,
          signatureParams.r,
          signatureParams.s
        )
        const addressBuffer = ethUtil.publicToAddress(publicKey)
        const address = ethUtil.bufferToHex(addressBuffer),
          checkSumAdd = await checkSumAddress(address),
          checkSumWallet = await checkSumAddress(wallet)
        if (checkSumAdd === checkSumWallet) {
          let userData = await userModel.getUserBywallet(checkSumWallet)
          if (userData) {
            const jwt = fastify.jwt.sign(
              {
                userId: userData._id,
                name: userData.name
              },
              { expiresIn: EXPIRESIN }
            )
            let respUser = {
              userId: userData._id,
              name: userData.name,
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
      //schema: userPayload.addSocialProfileSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        const { socialProfile } = request.body,
          { wallet } = request.user,
          socialPlatform = Object.keys(socialProfile)[0]
        // Check user exists or not
        const user = await userModel.getUserBywallet(wallet)
        if (!user) {
          if (!user) {
            reply.code(404).error({
              message: 'User not found'
            })
            return reply
          }
        }
        // Check profile exists in db or not
        const isSocialProfileExists = await userModel.checkSocialAccountExists(
          socialProfile
        )
        if (isSocialProfileExists) {
          reply.code(400).error({
            message: `${socialPlatform} profile already exists.`
          })
          return reply
        }

        // Add profile to social insider
        const result = await addProfile(socialProfile, socialPlatform)
        if (result.error) {
          let err = await errorMessage(socialPlatform)
          reply.code(400).error({
            message: err
          })
          return reply
        }

        // Add social account of a user to db
        const addSocialAccounts = await userModel.updateSocialAccounts(
          wallet,
          socialProfile
        )
        if (!addSocialAccounts) {
          reply.code(400).error({
            message: `Failed to add ${socialPlatform} profile.`
          })
          return reply
        } else {
          reply.success({
            message: `${socialPlatform} profile added successfully.`
          })
          return reply
        }
      } catch (err) {
        console.log(err)
        reply.error({
          message: `Failed to add ${socialPlatform} profile.`,
          error: err.message
        })
        return reply
      }
    }
  )
  // Upload nft to pinata
  fastify.post(
    '/asset/upload',
    {
      schema: userPayload.uploadAssetSchema
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
    '/asset/mint',
    { schema: userPayload.mintNftSchema, onRequest: [fastify.authenticate] },
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
      } catch (err) {
        console.log(err)
        reply.error({ message: 'Failed to mint asset.', error: err.message })
        return reply
      }
    }
  )
}

module.exports.autoPrefix = '/user'
