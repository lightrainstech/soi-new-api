'use strict'

const User = require('../models/userModel.js')
const UserToken = require('../models/userToken')
const publicPayload = require('../payload/publicPayload')

module.exports = async function (fastify, opts) {
  fastify.get(
    '/influencer/status',
    { schema: publicPayload.influencerStatusSchema },
    async function (request, reply) {
      try {
        const userModel = new User(),
          userTokenModel = new UserToken(),
          totalInfluencerCount = await userModel.getCount('influencer'),
          followersCount =
            await userTokenModel.getTotalFollowersInDifferentPlatform()
        if (totalInfluencerCount || followersCount.length) {
          const followerDetails = followersCount[0]
          reply.success({
            message: 'Status',
            totalInfluencers: totalInfluencerCount ? totalInfluencerCount : 0,
            followerDetails: followerDetails
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

  // Get brands avatar list
  fastify.get(
    '/brands/avatar',
    { schema: publicPayload.avatarsListSchema },
    async function (request, reply) {
      try {
        const userModel = new User()
        const avatarLists = await userModel.getAvatars('brand')
        if (avatarLists) {
          return reply.success({
            message: 'Avatar listed successfully.',
            avatarLists
          })
        } else {
          return reply.error({
            message: 'Failed tto fetch avatars.',
            avatarLists
          })
        }
      } catch (error) {
        console.log(error)
        reply.error({
          message: `Failed to fetch avatars. Please try again: ${error.message}`
        })
        return reply
      }
    }
  )
}
