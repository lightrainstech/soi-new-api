'use strict'
const Agency = require('../models/agencyModel')

const adminPayload = require('../payload/adminPayload.js')
const agencyPayload = require('../payload/agencyPayload')

const { checkSumAddress } = require('../utils/contract')

module.exports = async function (fastify, opts) {
  let { redis } = fastify
  // fastify.addHook('onRequest', async (request, reply) => {
  //   try {
  //     await request.jwtVerify()
  //   } catch (err) {
  //     reply.error(err)
  //   }
  // }),
  fastify.post(
    '/allocate-token',
    { schema: adminPayload.nftAlloctionSchema },
    async function (request, reply) {
      const { agencyCode, nftAllocation } = request.body
      try {
        redis.set(`NFTC:${agencyCode}`, Number(nftAllocation))
        reply.success({ message: 'NFTs has been allocated' })
      } catch (error) {
        reply.error({ message: error })
      }
    }
  )
  fastify.post(
    '/agency',
    { schema: agencyPayload.addNewAgency },
    async function (request, reply) {
      const { name, email, wallet } = request.body
      try {
        console.log(request.body)
        const agencyModel = new Agency(),
          checkSumWallet = await checkSumAddress(wallet),
          agency = await agencyModel.getAgencyByWallet(checkSumWallet)
        if (agency) {
          return reply.error({ message: 'Agency already exists.' })
        }
        agencyModel.name = name
        agencyModel.email = email
        agencyModel.wallet = checkSumWallet
        const newAgency = await agencyModel.save()
        if (newAgency) {
          return reply.code(201).success({
            message: 'Agency added successfully.',
            agency: newAgency
          })
        } else {
          reply.code(400).error({
            message: 'Failed to add agency.'
          })
          return reply
        }
      } catch (error) {
        console.log(error)
        reply.error({ message: error })
      }
    }
  )
}
