'use strict'

const ethUtil = require('ethereumjs-util')

const User = require('../models/userModel.js')
const userPayload = require('../payload/userPayload.js')
const Affiliate = require('../models/affiliateModel.js')

const { checkSumAddress } = require('../utils/contract')

const EXPIRESIN = process.env.JWT_TOKEN_EXPIRY || '3d'

let userModal = new User()

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
            // await fastify.bull.sendNFT.add(
            //   {
            //     email: newUsr.email,
            //     name: newUsr.name,
            //     userId: newUsr._id,
            //     affiliateCode: affCode,
            //     wallet: newUsr.wallet
            //   },
            //   { removeOnComplete: true, removeOnFail: false, backoff: 10000 }
            // )
            // let count = await redis.get(`NFTC:${affCode}`)
            // count = Number(count) - 1
            // await redis.set(`NFTC:${affCode}`, Number(count))
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
      try {
        const { userId } = request.user,
          user = await userModal.getUserById(userId)
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
    //{ schema: userPayload.getSignMessageSchema },
    async function (request, reply) {
      try {
        const { wallet, socialProfile } = request.body
        // Check user exists or not
        const user = await userModal.getUserBywallet(wallet)
        if (!user) {
          if (!user) {
            reply.code(404).error({
              message: 'User not found'
            })
            return reply
          }
        }

        // Check social account exists in db for any user
        const socialAccountExists = await userModal.checkSocialAccountExists(
          socialProfile
        )
        if (socialAccountExists == null) {
          const addSocialAccounts = await userModal.updateSocialAccounts(
            wallet,
            socialProfile
          )
          if (!addSocialAccounts) {
            reply.code(404).error({
              message: 'Failed to add social accounts.'
            })
            return reply
          } else {
            // Todo check profile exist in social insider if not add user profile to social insider.
            reply.success({
              message: 'Social accounts added successfully.'
            })
            return reply
          }
        } else {
          const entries1 = Object.entries(socialProfile),
            entries2 = Object.entries(socialAccountExists.social),
            matches = entries1.filter(
              ([key, value]) =>
                value &&
                entries2.some(
                  ([key2, value2]) => key === key2 && value === value2
                )
            )
          const str = matches.map(([key, value]) => key).join()
          reply.error({
            message: `Profile already exists for ${str}.`
          })
          return reply
        }
      } catch (error) {
        console.log(error)
        reply.error({
          message: 'Failed to add social accounts.'
        })
        return reply
      }
    }
  )
}

module.exports.autoPrefix = '/user'
