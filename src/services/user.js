'use strict'

const ethUtil = require('ethereumjs-util')

const User = require('../models/userModel.js')
const userPayload = require('../payload/userPayload.js')
const Affiliate = require('../models/affiliateModel.js')

const { checkSumAddress } = require('../utils/contract')
const { customAlphabet } = require('nanoid')
const nanoidLong = customAlphabet(
  '5eDVbMmnXU9GRaF3H4Cl2vwSzYsqfrLdyOIKWZ78hkJPgTN6xEjcQtABpu',
  10
)

const EXPIRESIN = process.env.JWT_TOKEN_EXPIRY || '3d'

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
        let userModal = new User()

        // Check email or userName is unique or not
        const user = await userModal.getUserByUserNameOrEmail(userName, email)
        if (user !== null && user.userName === userName) {
          reply.error({ message: 'User with this user name already exists.' })
          return reply
        }
        if (user !== null && user.email === email) {
          reply.error({ message: 'User with this email already exists.' })
          return reply
        }
        if (user === null) {
          userModal.name = name
          userModal.userName = userName
          userModal.phone = phone
          userModal.email = email
          userModal.country = country
          userModal.wallet = await checkSumAddress(wallet)

          if (affCode) {
            userModal.role = 'influencer'
          }
          const newUsr = await userModal.save()
          console.log('newUsr', newUsr)

          if (affCode) {
            Affiliate.create({
              user: newUsr._id,
              affiliateCode: affCode
            })
            await fastify.bull.sendNFT.add(
              {
                email: newUsr.email,
                name: newUsr.name,
                userId: newUsr._id,
                affiliateCode: affCode,
                wallet: newUsr.wallet
              },
              { removeOnComplete: true, removeOnFail: false, backoff: 10000 }
            )
            let count = await redis.get(`NFTC:${affCode}`)
            count = Number(count) - 1
            await redis.set(`NFTC:${affCode}`, Number(count))
          }
          const jwt = fastify.jwt.sign(
            {
              userId: newUsr._id,
              name: newUsr.name
            },
            { expiresIn: EXPIRESIN }
          )
          let respUser = {
            userId: newUsr._id,
            name: newUsr.name,
            userName: newUsr.userName,
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
      reply.success({
        message: 'Success'
      })
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
          userModal = new User()
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
          let userData = await userModal.getUserBywallet(checkSumWallet)
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

            reply.code(200).success({
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
  // Get unique message to sign wallet
  fastify.post(
    '/sign-message',
    { schema: userPayload.getSignMessageSchema },
    async function (request, reply) {
      try {
        const { wallet } = request.body,
          signMessage = `SOI sign message ${nanoidLong()}`
        reply.code(200).success({
          wallet: wallet,
          signMessage: signMessage
        })
        return reply
      } catch (error) {
        reply.error({
          message: 'Failed to generate sign message.'
        })
        return reply
      }
    }
  )
}

module.exports.autoPrefix = '/user'
