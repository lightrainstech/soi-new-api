'use strict'

const User = require('../models/userModel.js')
const publicPayload = require('../payload/publicPayload')

module.exports = async function (fastify, opts) {
  fastify.get(
    '/influencer/status',
    { schema: publicPayload.influencerStatusSchema },
    async function (request, reply) {
      try {
        const userModel = new User()
        const totalInfluencerCount = await userModel.getCount('influencer'),
          followersCount =
            await userModel.getTotalFollowersInDifferentPlatform()
        if (totalInfluencerCount || followersCount) {
          reply.success({
            message: 'Status',
            totalInfluencers: totalInfluencerCount ? totalInfluencerCount : 0,
            totalFollowers: followersCount
              ? followersCount[0].totalFollowers
              : 0
          })
          return reply
        } else {
          reply.error({
            message: 'Failed to fetch data. Please try again.'
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
}
