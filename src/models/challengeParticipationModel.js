'use strict'

const mongoose = require('mongoose')


const ChallengeParticipationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  challenge: {
    type: mongoose.Schema.ObjectId,
    ref: 'Challenge',
    required: true
  },
  hashTag: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  nftId: {
    type: String
  },
  team: {
    type: String
  }
})

ChallengeParticipationSchema.methods = {
  getParticipationDetails: async function (challengeId, userId, nftId) {
    const ChallengeParticipation = mongoose.model('ChallengeParticipation')
    return ChallengeParticipation.findOne({
      challenge: challengeId,
      user: userId,
      nftId: nftId,
      isActive: true
    })
  }
}

module.exports = mongoose.model(
  'ChallengeParticipation',
  ChallengeParticipationSchema
)
