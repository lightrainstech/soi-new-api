'use strict'

const adminPayload = require('../payload/adminPayload.js')

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
      const { affCode, nftAllocation } = request.body
      try {
        redis.set(`NFTC:${affCode}`, Number(nftAllocation))
        reply.success({ message: 'NFTs has been allocated' })
      } catch (error) {
        reply.error({ message: error })
      }
    }
  )
}
