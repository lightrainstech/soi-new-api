'use strict'

const mongoose = require('mongoose')
const ChallengeParticipation = require('../models/challengeParticipationModel')
const { getPostDetails, getAccountType } = require('../utils/soi')
const { pricePerPostMetrics } = require('../utils/bountyCalculator')
const Challenge = require('../models/challengeModel')

module.exports = async function (args, done) {
  console.log('--------Inside Fetch post details ---------')
  const { challengeId } = args.data

  try {
    const db = await mongoose.connect(process.env.MONGO_CONN, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })

    // Update challenge status
    const challengeModel = new Challenge()
    const updateChallenge = await challengeModel.updateChallengeStatus(
      challengeId,
      'started'
    )

    if (
      updateChallenge &&
      updateChallenge.status === 'started' &&
      updateChallenge.isFunded
    ) {
      const challengeParticipationModel = new ChallengeParticipation()
      const participants =
        await challengeParticipationModel.getChallengeParticipants(challengeId)

      if (participants.length > 0) {
        const updatePromises = participants.map(async participant => {
          const socialKeys = Object.keys(participant.nft.social).filter(
              key => participant.nft.social[key].socialInsiderId !== undefined
            ),
            postDetailsPromises = socialKeys.map(async key => {
              await new Promise(resolve => setTimeout(resolve, 300))
              return getPostDetails(
                participant.nft.social[key].socialInsiderId,
                getAccountType(key),
                participant.challenge.startDate,
                participant.challenge.endDate,
                participant.challenge.challengeIdentifier,
                key
              )
            })
          const postDetails = await Promise.all(postDetailsPromises)
          if (postDetails) {
            const updatePostDataPromises = socialKeys.map(async key => {
              let postData = postDetails.find(obj => obj[key])
              let totalLikes = postData ? postData[key].totalLikes : 0
              let key1 = `social.${key}.likes`
              let totalShares = postData ? postData[key].totalShares : 0
              let key2 = `social.${key}.shares`
              let totalComments = postData ? postData[key].totalComments : 0
              let key3 = `social.${key}.comments`
              let totalEngagement = postData ? postData[key].totalEngagement : 0
              let key4 = `social.${key}.engagement`
              let totalPostEngagementRate = postData
                ? parseFloat(postData[key].totalPostEngagementRate.toFixed(5))
                : 0
              let key5 = `social.${key}.post_engagement_rate`
              let totalImpressions = postData
                ? postData[key].totalImpressions
                : 0
              let key6 = `social.${key}.impressions`
              let totalPosts = postData ? postData[key].totalPosts : 0
              let key7 = `social.${key}.totalPosts`
              let totalVideoViews = postData ? postData[key].totalVideoViews : 0
              let key8 = `social.${key}.video_views`

              let totalPostsPrice = pricePerPostMetrics(key, 'post', totalPosts)
              let key9 = `social.${key}.totalPostsPrice`

              let totalLikesPrice = pricePerPostMetrics(key, 'like', totalLikes)
              let key10 = `social.${key}.totalLikesPrice`

              let totalSharesPrice = 0
              if (key !== 'youtube' && key !== 'instagram') {
                totalSharesPrice = pricePerPostMetrics(
                  key,
                  'share',
                  totalShares
                )
              }
              let key11 = `social.${key}.totalSharesPrice`

              let totalCommentsPrice = 0
              if (key !== 'twitter') {
                totalCommentsPrice = pricePerPostMetrics(
                  key,
                  'comment',
                  totalComments
                )
              }
              let key12 = `social.${key}.totalCommentsPrice`

              let totalViewsPrice = 0
              if (key !== 'instagram') {
                totalViewsPrice = pricePerPostMetrics(
                  key,
                  'video_view',
                  totalVideoViews
                )
              }
              let key13 = `social.${key}.totalViewsPrice`

              let totalEngagementsPrice = pricePerPostMetrics(
                key,
                'engagement',
                totalEngagement
              )
              let key14 = `social.${key}.totalEngagementsPrice`

              let totalImpressionsPrice = 0
              if (key === 'instagram') {
                totalImpressionsPrice = pricePerPostMetrics(
                  key,
                  'impression',
                  totalImpressions
                )
              }
              let key15 = `social.${key}.totalImpressionsPrice`

              await challengeParticipationModel.updatePostData(
                challengeId,
                participant.user,
                key1,
                totalLikes,
                key2,
                totalShares,
                key3,
                totalComments,
                key4,
                totalEngagement,
                key5,
                totalPostEngagementRate,
                key6,
                totalImpressions,
                key7,
                totalPosts,
                key8,
                totalVideoViews,
                key9,
                totalPostsPrice,
                key10,
                totalLikesPrice,
                key11,
                totalSharesPrice,
                key12,
                totalCommentsPrice,
                key13,
                totalViewsPrice,
                key14,
                totalEngagementsPrice,
                key15,
                totalImpressionsPrice
              )
            })
            await Promise.all(updatePostDataPromises)
          }
        })
        await Promise.all(updatePromises)
        console.log('Post details updated')
        console.log('---------done-------')
        done()
      }else {
        console.log('Exiting. No participants.')
        done()
      }
    } else {
      console.log('Exiting. Challenge not started or funded.')
      done()
    }
  } catch (error) {
    console.log(error)
  }
}
