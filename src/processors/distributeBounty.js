'use strict'

const mongoose = require('mongoose')
const ChallengeParticipation = require('../models/challengeParticipationModel')
const Challenge = require('../models/challengeModel')
const { distributeBountyInJob } = require('../utils/bountyCalculator')
const { distributeBounty } = require('../utils/challengeContract')

module.exports = async function (args, done) {
  console.log('--------Inside distribute bounty---------')
  const { challengeId, wallet } = args.data

  try {
    const db = await mongoose.connect(process.env.MONGO_CONN, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })

    const challengeParticipationModel = new ChallengeParticipation()
    const challengeModel = new Challenge()
    const challenge = await challengeModel.getChallengeById(challengeId)

    const participants =
      await challengeParticipationModel.getUserBountyReceived(challengeId)

    if (challenge && participants.length > 0) {
      const { wallets, amounts } = await distributeBountyInJob(
        challenge.bountyOffered,
        participants.userTotals,
        participants.totalBountyAllUsers,
        challengeId,
        wallet
      )
      const tx = await distributeBounty(
        challenge.challengeAddress,
        wallets,
        amounts
      )
      if (tx) {
        console.log('Bounty distribution completed..')
        await challengeModel.updateChallengeStatus(challengeId, 'completed')
        done()
      }
    } else {
      console.log('Exiting. No participants.')
      done()
    }
  } catch (error) {
    console.log(`Bounty distribution failed - ${error.message}`)
  }
}
