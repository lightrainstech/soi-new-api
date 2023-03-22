'use strict'

const mongoose = require('mongoose')
const ChallengeParticipation = require('../models/challengeParticipationModel')
const { getPostDetails, getAccountType } = require('../utils/soi')

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
            let postData = postDetails.find(obj => obj[key]),
              totalLikes = postData ? postData[key].totalLikes : 0,
              key1 = `social.${key}.likes`,
              totalShares = postData ? postData[key].totalShares : 0,
              key2 = `social.${key}.shares`
            await challengeParticipationModel.updatePostData(
              challengeId,
              participant.user,
              key1,
              totalLikes,
              key2,
              totalShares
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
