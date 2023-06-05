'use strict'

const mongoose = require('mongoose')
const Challenge = require('../models/challengeModel')

module.exports = async function (args, done) {
  console.log('--------Inside cancel challenge---------')
  const { challengeId } = args.data

  try {
    const db = await mongoose.connect(process.env.MONGO_CONN, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })

    const challengeModel = new Challenge()
    const challenge = await challengeModel.getChallengeById(challengeId)

    if (challenge && challenge.status === 'created' && !challenge.isFunded) {
      await challengeModel.updateChallengeStatus(challengeId, 'cancelled')
      console.log('Challenge cancelled.')
      done()
    } else {
      console.log('Exiting cancel challenge.')
      done()
    }
  } catch (error) {
    console.log(`Failed to cancel challenge - ${error.message}`)
  }
}
