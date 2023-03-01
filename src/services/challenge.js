'use strict'

const Challenge = require('../models/challengeModel')
const challengePayload = require('../payload/challengPayload')
const { randomHashTag } = require('../utils/hashtag')

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
          title,
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
          bountyOffered,
          location
        } = request.body

        // Create unique hashtag for challenge
        let challengeHashTag
        do {
          challengeHashTag = randomHashTag()
        } while (
          await Challenge.findOne({ challengeHashTag: challengeHashTag })
        )

        const newChallengeData = new Challenge({
          user: userId,
          title,
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
          bountyOffered,
          challengeHashTag,
          location
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
        return reply.error({
          message: `Failed to create challenge. Please try again.`
        })
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
        return reply.error({
          message: 'Failed to fetch challenge details. Pleas try again.'
        })
      }
    }
  )
  // Get all challenges
  fastify.get(
    '/',
    {
      schema: challengePayload.getUserChallengesSchema,
    },
    async function (request, reply) {
      try {
        const challengeModel = new Challenge()
        const challenges = await challengeModel.getAllChallenges()
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
        return reply.error({
          message: 'Failed to fetch challenges. Pleas try again.'
        })
      }
    }
  )
  // Update challenge
  fastify.put(
    '/:id',
    {
      schema: challengePayload.updateChallengeSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        const { id } = request.params
        const challengeModel = new Challenge()
        const {
          title,
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
          bountyOffered,
          challengeHashTag,
          location
        } = request.body

        const data = {
          title: title,
          description: description,
          facebookText: facebookText,
          instagramText: instagramText,
          twitterText: twitterText,
          youtubeText: youtubeText,
          tiktokText: tiktokText,
          hashtags: hashtags,
          mentions: mentions,
          startDate: startDate,
          endDate: endDate,
          externalLink: externalLink,
          bountyOffered: bountyOffered,
          challengeHashTag: challengeHashTag,
          location: location
        }
        const challenge = await challengeModel.getChallengeById(id)
        if (!challenge) {
          reply.code(404).error({
            message: 'Challenge not found.'
          })
          return reply
        }
        const updateChallenge = await challengeModel.updateChallengesById(
          id,
          data
        )
        if (updateChallenge) {
          return reply.code(201).success({
            message: 'Challenge updated successfully.',
            challenge: updateChallenge
          })
        } else {
          return reply.code(400).error({
            message: 'Failed to update challenge please try again.',
            challenge: {}
          })
        }
      } catch (error) {
        console.log(error)
        return reply.error({
          message: `Failed to update challenge. Please try again.`
        })
      }
    }
  )
}

module.exports.autoPrefix = '/challenges'