'use strict'

const Challenge = require('../models/challengeModel')
const challengePayload = require('../payload/challengePayload')
const { randomHashTag, getTeamName } = require('../utils/hashtag')
const ChallengeParticipation = require('../models/challengeParticipationModel')
const {
  createCampaign,
  getAccountType,
  getPostDetails
} = require('../utils/soi')
const {
  pricePerPostMetrics,
  distributeBounty
} = require('../utils/bountyCalculator')
const UserToken = require('../models/userToken')

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
          locations
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
          locations,
          challengeIdentifier
        })
        const savedChallenge = await newChallengeData.save()
        // Schedule a job
        const delayDate = new Date(startDate).getTime() - Date.now()
        const job = await fastify.bull.fetchPostDetails.add(
          {
            challengeId: savedChallenge._id
          },
          {
            removeOnFail: false,
            delay: delayDate,
            attempts: 2,
            backoff: 10000,
            repeat: {
              cron: '0 8,20 * * *', // Every day 8am and 8pm between the given start and end date
              startDate: new Date(startDate),
              endDate: new Date(endDate)
            },
            removeOnComplete: true
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
        const userTokenModel = new UserToken()

        const { userId } = request.user
        const { challengeId } = request.params
        const { nftId, nftHashTag } = request.body

        // Check at least one social media profile exists or not
        const nft = await userTokenModel.getUserTokenById(nftId, userId)
        const socialKeys = Object.keys(nft.social).filter(
          key => nft.social[key].socialInsiderId !== undefined
        )

        if (Object.keys(socialKeys).length < 1) {
          return reply.error({
            message: `You have not connected any social media profile .Please connect at least one social media profile.`
          })
        }

        const challenge = await challengeModel.getChallengeById(challengeId)

        const currentTime = new Date()
        // Check the challenge has started or not
        const startDate = new Date(challenge.startDate)
        if (currentTime.getTime() < startDate.getTime()) {
          return reply.error({
            message: 'Cannot join challenge. The challenge has not started yet.'
          })
        }
        // Check the challenge has ended or not
        const endDate = new Date(challenge.endDate)
        if (currentTime.getTime() > endDate.getTime()) {
          return reply.error({
            message: 'Cannot join challenge. The challenge has ended.'
          })
        }

        // Check participation exists or not
        // const participation =
        //   await challengeParticipationModel.getParticipationDetails(
        //     userId,
        //     nftId
        //   )

        // if (participation.length) {
        //   return reply.error({
        //     message:
        //       'Already participating in a challenge with the selected NFT.'
        //   })
        // }

        const team = await getTeamName(nftId)
        const hashTag = `#${challenge.challengeHashTag}${team}${nftHashTag}`

        // Join query_string
        let queryString
        if (!challenge.participantsHashTags.length > 0) {
          queryString = hashTag
        } else {
          const currentQueryStrings =
            challenge.participantsHashTags.join(' OR ')
          queryString = currentQueryStrings + ' OR ' + hashTag
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
            message: 'No participants found in this challenge.'
          })
        }

        return reply.success({
          message: 'Participants details listed successfully.',
          participants
        })

        // const participants =
        //   await challengeParticipationModel.getChallengeParticipants(
        //     challengeId
        //   )

        // if (participants.length) {
        //   const updatePromises = participants.map(async participant => {
        //     const socialKeys = Object.keys(participant.nft.social).filter(
        //         key => participant.nft.social[key].socialInsiderId !== undefined
        //       ),
        //       postDetailsPromises = socialKeys.map(async key => {
        //         return getPostDetails(
        //           participant.nft.social[key].socialInsiderId,
        //           getAccountType(key),
        //           participant.challenge.startDate,
        //           participant.challenge.endDate,
        //           participant.challenge.challengeIdentifier,
        //           key
        //         )
        //       })
        //     const postDetails = await Promise.all(postDetailsPromises)
        //     if (postDetails) {
        //       const updatePostDataPromises = socialKeys.map(async key => {
        //         let postData = postDetails.find(obj => obj[key])
        //         let totalLikes = postData ? postData[key].totalLikes : 0
        //         let key1 = `social.${key}.likes`
        //         let totalShares = postData ? postData[key].totalShares : 0
        //         let key2 = `social.${key}.shares`
        //         let totalComments = postData ? postData[key].totalComments : 0
        //         let key3 = `social.${key}.comments`
        //         let totalEngagement = postData
        //           ? postData[key].totalEngagement
        //           : 0
        //         let key4 = `social.${key}.engagement`
        //         let totalPostEngagementRate = postData
        //           ? postData[key].totalPostEngagementRate
        //           : 0
        //         let key5 = `social.${key}.post_engagement_rate`
        //         let totalImpressions = postData
        //           ? postData[key].totalImpressions
        //           : 0
        //         let key6 = `social.${key}.impressions`
        //         let totalPosts = postData ? postData[key].totalPosts : 0
        //         let key7 = `social.${key}.totalPosts`
        //         let totalVideoViews = postData
        //           ? postData[key].totalVideoViews
        //           : 0
        //         let key8 = `social.${key}.video_views`

        //         let totalPostsPrice = pricePerPostMetrics(
        //           key,
        //           'post',
        //           totalPosts
        //         )
        //         let key9 = `social.${key}.totalPostsPrice`

        //         let totalLikesPrice = pricePerPostMetrics(
        //           key,
        //           'like',
        //           totalLikes
        //         )
        //         let key10 = `social.${key}.totalLikesPrice`

        //         let totalSharesPrice = 0
        //         if (key !== 'youtube') {
        //           totalSharesPrice = pricePerPostMetrics(
        //             key,
        //             'share',
        //             totalShares
        //           )
        //         }
        //         let key11 = `social.${key}.totalSharesPrice`

        //         let totalCommentsPrice = pricePerPostMetrics(
        //           key,
        //           'comment',
        //           totalComments
        //         )
        //         let key12 = `social.${key}.totalCommentsPrice`

        //         const metricsMap = {
        //           youtube: 'view',
        //           tiktok: 'play'
        //         }

        //         let totalViewsPrice = 0
        //         if (key in metricsMap) {
        //           const metric = metricsMap[key]
        //           totalViewsPrice = pricePerPostMetrics(
        //             key,
        //             metric,
        //             totalVideoViews
        //           )
        //         }
        //         let key13 = `social.${key}.totalViewsPrice`

        //         await challengeParticipationModel.updatePostData(
        //           challengeId,
        //           participant.user,
        //           key1,
        //           totalLikes,
        //           key2,
        //           totalShares,
        //           key3,
        //           totalComments,
        //           key4,
        //           totalEngagement,
        //           key5,
        //           totalPostEngagementRate,
        //           key6,
        //           totalImpressions,
        //           key7,
        //           totalPosts,
        //           key8,
        //           totalVideoViews,
        //           key9,
        //           totalPostsPrice,
        //           key10,
        //           totalLikesPrice,
        //           key11,
        //           totalSharesPrice,
        //           key12,
        //           totalCommentsPrice,
        //           key13,
        //           totalViewsPrice,
        //         )
        //       })
        //       await Promise.all(updatePostDataPromises)
        //     }
        //   })
        //   await Promise.all(updatePromises)
        // }
        // return reply.success({
        //   message: 'Done.',
        // })
      } catch (error) {
        console.log(error)
        return reply.error({
          message: 'Failed to fetch participation details. Please try again.'
        })
      }
    }
  )
  // Get bounty distribution
  fastify.get(
    '/:challengeId/bounty-distribution',
    {
      schema: challengePayload.getBountyDetails,
      onRequest: [fastify.authenticate]
    },
    async function (request, reply) {
      try {
        const { challengeId } = request.params
        const challengeParticipationModel = new ChallengeParticipation()
        const challengeModel = new Challenge()
        const challenge = await challengeModel.getChallengeById(challengeId)

        const participants =
          await challengeParticipationModel.getUserBountyReceived(challengeId)
        const bountyData = await distributeBounty(
          challenge.bountyOffered,
          participants.userTotals,
          participants.totalBountyAllUsers,
          challengeId
        )
        return reply.success({
          message: 'Bounty distribution.',
          bountyData
        })
      } catch (error) {
        console.log(error)
        return reply.error({
          message: 'Failed to fetch bounty distribution details. Please try again.'
        })
      }
    }
  )
}

module.exports.autoPrefix = '/challenges'
