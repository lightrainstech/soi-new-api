'use strict'

const Challenge = require('../models/challengeModel')
const challengePayload = require('../payload/challengPayload')

module.exports = async function (fastify, opts) {
  // Create challenge
  fastify.post(
    '/',
    {
      schema: challengePayload.createChallengeSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        const { userId } = request.user
        const {
          name,
          description,
          facebookText,
          instagramText,
          twitterText,
          youtubeText,
          tiktokText,
          hashtags,
          mentions,
          startDate,
          endDate,
          externalLink,
          faceBookPosts,
          youtubePosts,
          instagramPosts,
          twitterPosts,
          tiktokPosts,
          likes,
          shares,
          youtubeViews,
          bountyRequired,
          bountyOffered
        } = request.body

        const newChallengeData = new Challenge({
          user: userId,
          name,
          description,
          facebookText,
          instagramText,
          twitterText,
          youtubeText,
          tiktokText,
          hashtags,
          mentions,
          startDate,
          endDate,
          externalLink,
          faceBookPosts,
          youtubePosts,
          instagramPosts,
          twitterPosts,
          tiktokPosts,
          likes,
          shares,
          youtubeViews,
          bountyRequired,
          bountyOffered
        })
        const savedChallenge = await newChallengeData.save()
        if (savedChallenge) {
          return reply.code(201).success({
            message: 'Challenge created successfully.',
            challenge: savedChallenge
          })
        } else {
          return reply.code(400).error({
            message: 'Failed to create challenge please try again.',
            challenge: {}
          })
        }
      } catch (error) {
        console.log(error)
        reply.error({
          message: `Failed to create challenge. Please try again.`
        })
        return reply
      }
    }
  )
  // Get challenge details
  fastify.get(
    '/:id',
    {
      schema: challengePayload.getChallengeSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        const challengeModel = new Challenge(),
          { id } = request.params,
          challenge = await challengeModel.getChallengeById(id)
        if (!challenge) {
          reply.code(404).error({
            message: 'Challenge not found.'
          })
          return reply
        }
        reply.success({
          message: 'Challenge details',
          challenge
        })
        return reply
      } catch (error) {
        console.log(error)
        reply.error({
          message: 'Failed to fetch challenge details. Pleas try again.'
        })
      }
    }
  )
  // Get challenge details
  fastify.get(
    '/',
    {
      schema: challengePayload.getUserChallengesSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        const challengeModel = new Challenge(),
          { userId } = request.user,
        challenges = await challengeModel.getChallengesByUser(userId)
        if (!challenges.length) {
          reply.code(404).error({
            message: 'No challenges found.'
          })
          return reply
        }
        reply.success({
          message: 'Challenge details',
          challenges
        })
        return reply
      } catch (error) {
        console.log(error)
        reply.error({
          message: 'Failed to fetch challenges. Pleas try again.'
        })
      }
    }
  )
}

module.exports.autoPrefix = '/challenges'
