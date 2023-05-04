'use strict'

const mongoose = require('mongoose')
const ChallengeParticipation = require('../models/challengeParticipationModel')
const { getPostDetails, getAccountType } = require('../utils/soi')
const { pricePerPostMetrics } = require('../utils/bountyCalculator')

module.exports = async function (args, done) {
  const { challengeId } = args.data
  console.log('--------Inside Fetch post details ---------')
  try {
    const db = await mongoose.connect(process.env.MONGO_CONN, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    const challengeParticipationModel = new ChallengeParticipation()
    const participants =
      await challengeParticipationModel.getChallengeParticipants(challengeId)

    if (participants.length) {
      const updatePromises = participants.map(async participant => {
        const socialKeys = Object.keys(participant.nft.social).filter(
            key => participant.nft.social[key].socialInsiderId !== undefined
          ),
          postDetailsPromises = socialKeys.map(async key => {
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
              ? postData[key].totalPostEngagementRate
              : 0
            let key5 = `social.${key}.post_engagement_rate`
            let totalImpressions = postData ? postData[key].totalImpressions : 0
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
            if (key !== 'youtube') {
              totalSharesPrice = pricePerPostMetrics(key, 'share', totalShares)
            }
            let key11 = `social.${key}.totalSharesPrice`

            let totalCommentsPrice = pricePerPostMetrics(
              key,
              'comment',
              totalComments
            )
            let key12 = `social.${key}.totalCommentsPrice`

            const metricsMap = {
              youtube: 'view',
              tiktok: 'play'
            }

            let totalViewsPrice = 0
            if (key in metricsMap) {
              const metric = metricsMap[key]
              totalViewsPrice = pricePerPostMetrics(
                key,
                metric,
                totalVideoViews
              )
            }
            let key13 = `social.${key}.totalViewsPrice`

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
              totalViewsPrice
            )
          })
          await Promise.all(updatePostDataPromises)
        }
      })
      await Promise.all(updatePromises)
    }
    console.log('saved')
    console.log('---------done-------')
    done()
  } catch (error) {
    console.log(error)
  }
}
