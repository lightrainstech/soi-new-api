'use strict'

const Agency = require('../models/agencyModel')
const { checkSumAddress } = require('../utils/contract')
const { uploadToS3 } = require('../utils/S3Config')
const brandPayload = require('../payload/brandPayload')

const EXPIRESIN = process.env.JWT_TOKEN_EXPIRY || '3d'

module.exports = async function (fastify, opts) {
  // Add new brand
  fastify.post(
    '/',
    { schema: brandPayload.addNewBrandSchema },
    async function (request, reply) {
      try {
        const agencyModel = new Agency()
        const { companyName, companyEmail, wallet, file } = request.body
        if (!Array.isArray(file) || !file[0].filename) {
          reply.error({
            statusCode: 422,
            message: 'Please select a valid file.'
          })
          return reply
        }
        const checkSumWallet = await checkSumAddress(wallet)
        const isBrandExists = await agencyModel.getBrandByEmail(companyEmail)
        if (isBrandExists) {
          return reply.code(400).error({
            message: 'Brand already exists.'
          })
        }
        const { link } = await uploadToS3(file, 'brand')
        agencyModel.name = companyName
        agencyModel.email = companyEmail
        agencyModel.wallet = checkSumWallet
        agencyModel.role = 'brand'
        agencyModel.logo = link
        const newBrand = await agencyModel.save()
        if (newBrand) {
          const jwt = fastify.jwt.sign(
            {
              brandId: newBrand._id,
              name: newBrand.name,
              wallet: newBrand.wallet,
              email: newBrand.email,
              role: newBrand.role
            },
            { expiresIn: EXPIRESIN }
          )
          return reply.success({
            message: 'Brand sign up successful.',
            brand: newBrand,
            accessToken: jwt
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
}

module.exports.autoPrefix = '/brand'
