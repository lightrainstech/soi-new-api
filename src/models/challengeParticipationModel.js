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
  }
})

module.exports = mongoose.model(
  'ChallengeParticipation',
  ChallengeParticipationSchema
)
