'use strict'

const ethUtil = require('ethereumjs-util')
const Agency = require('../models/agencyModel')
const User = require('../models/userModel')
const { checkSumAddress } = require('../utils/contract')
const { uploadToS3 } = require('../utils/S3Config')
const brandPayload = require('../payload/brandPayload')
const Affiliate = require('../models/affiliateModel.js')
const Challenge = require('../models/challengeModel')
const ChallengeParticipation = require('../models/challengeParticipationModel')

const EXPIRESIN = process.env.JWT_TOKEN_EXPIRY || '3d'

module.exports = async function (fastify, opts) {
  // Add new brand
  fastify.post(
    '/',
    { schema: brandPayload.addNewBrandSchema },
    async function (request, reply) {
      try {
        const userModel = new User()
        const { name, email, wallet, file } = request.body
        const { agencyCode } = request.query

        // File validation
        if (!Array.isArray(file) || !file[0].filename) {
          return reply.error({
            statusCode: 422,
            message: 'Please select a valid file.'
          })
        }

        // Check for agency
        const agency = await userModel.checkAffiliateCode(agencyCode)
        if (!agency) {
          return reply.error({
            message: 'Invalid agency code.'
          })
        }

        const checkSumWallet = await checkSumAddress(wallet)
        const isBrandExists = await userModel.getUserByEmailOrWallet(
          email,
          checkSumWallet,
          'brand'
        )
        if (isBrandExists) {
          return reply.code(400).error({
            message: 'Brand already exists.'
          })
        }

        // Upload file to S3
        const { link } = await uploadToS3(file, 'brand')

        // Create new brand
        userModel.name = name
        userModel.email = email.toString().toLowerCase()
        userModel.wallet = checkSumWallet
        userModel.role = 'brand'
        userModel.avatar = link
        userModel.userName = email
        const newBrand = await userModel.save()

        if (agencyCode) {
          Affiliate.create({
            user: newBrand._id,
            agencyCode: agencyCode,
            role: 'brand'
          })
        }

        if (newBrand) {
          const jwt = fastify.jwt.sign(
            {
              userId: newBrand._id,
              name: newBrand.name,
              wallet: newBrand.wallet,
              role: newBrand.role,
              agencyCode: agencyCode
            },
            { expiresIn: EXPIRESIN }
          )
          let respUser = {
            userId: newBrand._id,
            name: newBrand.name,
            wallet: newBrand.wallet,
            role: newBrand.role,
            logo: newBrand.logo,
            accessToken: jwt
          }
          return reply.success({
            message: 'Brand sign up successful.',
            respUser
          })
        } else {
          return reply.error({
            message: 'Brand sign up failed. Please try again.'
          })
        }
      } catch (error) {
        console.log(error)
        return reply.error({
          message: `Brand sign up failed. Please try again: ${error.message}`
        })
      }
    }
  )
  fastify.get(
    '/',
    {
      schema: brandPayload.getBrandDetailSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        const { email, wallet } = request.user
        const userModel = new User()
        const brand = await userModel.getBrandByEmailOrWallet(email, wallet)
        if (!brand) {
          return reply.code(404).error({
            message: 'Brand not found.'
          })
        } else {
          return reply.success({
            message: 'Brand details.',
            brand
          })
        }
      } catch (error) {
        console.log(error)
        reply.error({
          message: `Failed to fetch brand details. Please try again: ${error.message}`
        })
        return reply
      }
    }
  )
  // Check agencyCode
  fastify.get(
    '/check',
    { schema: brandPayload.checkAgencyCodeForBrandSchema },
    async function (request, reply) {
      try {
        const userModel = new User()
        const { agencyCode } = request.query

        // Check for agency
        const agency = await userModel.checkAffiliateCode(agencyCode)
        if (!agency) {
          return reply.error({
            message: 'Invalid agency code.',
            isValid: false
          })
        } else {
          return reply.success({
            message: 'Valid agency code.',
            agency,
            isValid: true
          })
        }
      } catch (error) {
        console.log(error)
        reply.error({
          message: `Failed to check agency code. Please try again: ${error.message}`
        })
        return reply
      }
    }
  )
  // Wallet signature verification
  fastify.post(
    '/walletConnect',
    { schema: brandPayload.walletConnectSchema },
    async function (request, reply) {
      const { wallet, signature, message } = request.body
      const agencyModel = new Agency()
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
      const address = ethUtil.bufferToHex(addressBuffer)
      const checkSumAdd = await checkSumAddress(address)
      const checkSumWallet = await checkSumAddress(wallet)
      if (checkSumAdd === checkSumWallet) {
        let brandData = await agencyModel.getBrandByWallet(checkSumWallet)
        if (brandData) {
          const agency = await agencyModel.getAgencyById(brandData.parent)
          const jwt = fastify.jwt.sign(
            {
              brandId: brandData._id,
              name: brandData.name,
              wallet: brandData.wallet,
              email: brandData.email,
              role: brandData.role,
              agencyCode: agency?.agencyCode
            },
            { expiresIn: EXPIRESIN }
          )
          let respUser = {
            brandId: brandData._id,
            name: brandData.name,
            wallet: brandData.wallet,
            email: brandData.email,
            role: brandData.role,
            logo: brandData.logo,
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
  // Get all challenges by brand
  fastify.get(
    '/challenges',
    {
      schema: brandPayload.getBrandChallengesSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        const { userId } = request.user
        const challengeModel = new Challenge()
        const challenges = await challengeModel.getAllChallengesByBrand(userId)
        if (!challenges.length) {
          reply.code(404).error({
            message: 'No challenges found.'
          })
          return reply
        }
        reply.success({
          message: 'Challenges listed successfully.',
          challenges
        })
        return reply
      } catch (error) {
        console.log(error)
        return reply.error({
          message: 'Failed to fetch challenges. Pleas try again.'
        })
      }
    }
  )
  // API to fetch brand dashboard status
  fastify.get(
    '/dashboard',
    {
      schema: brandPayload.getBrandDashboardSchema,
      onRequest: [fastify.authenticate]
    },
    function (request, reply) {
      try {
        const { role, userId } = request.user
        const challengeModel = new Challenge()
        const userModel = new User()
        const challengeParticipationModel = new ChallengeParticipation()

        // Check role
        if (role !== 'brand') {
          return reply.code(401).error({
            message: 'You are not authorized to do this operation.'
          })
        }

        // promise array
        const promises = [
          challengeModel.getTotalChallengesCount(userId),
          userModel.getCount('influencer'),
          challengeParticipationModel.calculatePostMetrics(userId),
          challengeParticipationModel.getTeamLeaderBoard(userId, 5)
        ]

        Promise.all(promises)
          .then(function (results) {
            const totalChallenges = results[0].totalChallenges
            const totalChallengesByBrand = results[0].totalChallengesByBrand
            const totalInfluencer = results[1]
            const totalInfluencerParticipation =
              results[0].totalInfluencerParticipation
            const totalReach = results[2].totalImpressions
            const totalEngagements = results[2].totalEngagements
            const totalBounty = results[2].totalBounty
            const totalPostEngagementRate = results[2].totalPostEngagementRate
            const topFiveTeams = results[3]

            const avgEngagement =
              parseFloat((totalEngagements / totalChallenges).toFixed(2)) || 0

            const engagementRate =
              parseFloat((totalPostEngagementRate / 100).toFixed(2)) || 0

            const CPV = parseFloat((totalBounty / totalReach).toFixed(2)) || 0

            const CPC =
              parseFloat((totalBounty / totalEngagements).toFixed(2)) || 0

            return reply.success({
              challenges: {
                totalChallenges,
                totalChallengesByBrand
              },
              influencerUptake: {
                totalInfluencer,
                totalInfluencerParticipation
              },
              totalReach,
              totalEngagements,
              avgEngagement,
              engagementRate,
              CPV,
              CPC,
              topFiveTeams
            })
          })
          .catch(function (err) {
            console.log(err)
            return reply.error({
              message: 'Failed to fetch dashboard details. Please try again.'
            })
          })
      } catch (error) {
        console.log(error)
        return reply.error({
          message: 'Failed to fetch dashboard details. Please try again.'
        })
      }
    }
  )
}

module.exports.autoPrefix = '/brands'
