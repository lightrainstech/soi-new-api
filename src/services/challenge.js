'use strict'

const Challenge = require('../models/challengeModel')
const challengePayload = require('../payload/challengePayload')
const { randomHashTag, getTeamName } = require('../utils/hashtag')
const ChallengeParticipation = require('../models/challengeParticipationModel')
const { createCampaign } = require('../utils/soi')

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
        const { userId, role } = request.user
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

        const challengeTitle = title.toUpperCase()

        // Check role
        if (role !== 'brand') {
          return reply.code(401).error({
            message: 'You are not authorized to do this operation.'
          })
        }

        // Create unique hashtag for challenge
        let challengeHashTag
        do {
          challengeHashTag = randomHashTag()
        } while (
          await Challenge.findOne({ challengeHashTag: challengeHashTag })
        )

        // Create campaign in socialInsider
        const queryString = `#${challengeHashTag}`
        const challengeIdentifier = `SOI-Challenge-${challengeHashTag}`
        const result = await createCampaign(challengeIdentifier, queryString)

        if (result.resp !== 'Success') {
          return reply.code(400).error({
            message:
              'Failed to create campaign inside socialInsider.Please try again.',
            challenge: {}
          })
        }

        // Create new challenge
        const newChallengeData = new Challenge({
          user: userId,
          title: challengeTitle,
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
          location,
          challengeIdentifier
        })
        const savedChallenge = await newChallengeData.save()
        // Schedule a job
        const delayDate = new Date(endDate).getTime() - Date.now()
        const job = await fastify.bull.fetchPostDetails.add(
          {
            challengeId: savedChallenge._id
          },
          {
            removeOnComplete: true,
            removeOnFail: false,
            delay: delayDate,
            attempts: 2,
            backoff: 10000
          }
        )
        if (!savedChallenge) {
          return reply.code(400).error({
            message: 'Failed to create challenge please try again.',
            challenge: {}
          })
        }
        return reply.code(201).success({
          message: 'Challenge created successfully.',
          challenge: savedChallenge
        })
      } catch (error) {
        console.log(error)
        return reply.code(500).send({
          message: `Failed to create challenge. Please try again. ${error.message}`
        })
      }
    }
  )
  // Get challenge details
  fastify.get(
    '/:challengeId',
    {
      schema: challengePayload.getChallengeSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        const challengeModel = new Challenge(),
          { challengeId } = request.params,
          challenge = await challengeModel.getChallengeDetails(challengeId)
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
      onRequest: [fastify.authenticate]
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
        const { role } = request.user
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

        // Check role
        if (role !== 'brand') {
          return reply.code(401).error({
            message: 'You are not authorized to do this operation.'
          })
        }

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
          return reply.error({
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
  // Join challenge and create hash tag
  fastify.post(
    '/:challengeId/join',
    {
      schema: challengePayload.createhashTagSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        const challengeModel = new Challenge()
        const challengeParticipationModel = new ChallengeParticipation()

        const { userId } = request.user
        const { challengeId } = request.params
        const { nftId, nftHashTag } = request.body

        // Check participation exists or not
        const participation =
          await challengeParticipationModel.getParticipationDetails(
            challengeId,
            userId,
            nftId
          )

        if (participation) {
          return reply.error({
            message:
              'Already participating in a challenge with the selected NFT.'
          })
        }

        const challenge = await challengeModel.getChallengeById(challengeId)
        const team = await getTeamName(nftId)
        const hashTag = `#${challenge.challengeHashTag}${team}${nftHashTag}`

        // Join query_string
        let queryString
        if (!challenge.participantsHashTags.length > 0) {
          queryString = hashTag
        } else {
          const currentQueryStrings =
            challenge.participantsHashTags.join(' AND ')
          queryString = currentQueryStrings + ' AND ' + hashTag
        }

        // Update query_string in socialInsider
        const result = await createCampaign(
          challenge.challengeIdentifier,
          queryString
        )
        if (result.resp === 'Success') {
          challengeParticipationModel.user = userId
          challengeParticipationModel.challenge = challengeId
          challengeParticipationModel.hashTag = hashTag
          challengeParticipationModel.nftId = nftId
          challengeParticipationModel.team = team
          await challengeParticipationModel.save()

          await challengeModel.updateChallengeParticipants(
            challengeId,
            userId,
            hashTag
          )

          return reply.success({
            message: 'Challenge HashTag.',
            hashTag
          })
        } else {
          return reply.error({
            message: 'Failed to join challenge. Please try again.'
          })
        }
      } catch (error) {
        console.log(error)
        return reply.error({
          message: 'Failed to join challenge. Please try again.'
        })
      }
    }
  )
  // Get unique hashtag
  fastify.get(
    '/:challengeId/hashtag',
    {
      schema: challengePayload.getHashTagSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        const challengeParticipationModel = new ChallengeParticipation()
        const { userId } = request.user
        const { challengeId } = request.params
        const { nftId } = request.query

        const participation =
          await challengeParticipationModel.getParticipationDetails(
            challengeId,
            userId,
            nftId
          )

        if (!participation) {
          return reply.error({
            message: 'You have not joined any challenge.'
          })
        }

        return reply.success({
          message: 'Challenge hashtag.',
          hashtag: participation.hashTag
        })
      } catch (error) {
        console.log(error)
        return reply.error({
          message: 'Failed to fetch hashtag. Please try again.'
        })
      }
    }
  )
  // Get challenge participants
  fastify.get(
    '/:challengeId/participants',
    {
      schema: challengePayload.getChallengeParticipantsDetailSchema,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        const { challengeId } = request.params
        const challengeParticipationModel = new ChallengeParticipation()
        const participants =
          await challengeParticipationModel.getChallengeParticipantsByTeam(
            challengeId
          )

        if (!participants) {
          return reply.error({
            message: 'You have not joined any challenge.'
          })
        }

        return reply.success({
          message: 'Participation details.',
          participants
        })
      } catch (error) {
        console.log(error)
        return reply.error({
          message: 'Failed to fetch participation details. Please try again.'
        })
      }
    }
  )
}

module.exports.autoPrefix = '/challenges'
