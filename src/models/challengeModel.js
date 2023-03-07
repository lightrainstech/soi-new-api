'use strict'

const mongoose = require('mongoose')

const ChallengeSchema = new mongoose.Schema({
  brand: {
    type: mongoose.Schema.ObjectId,
    ref: 'Agency',
    required: true
  },
  title: {
    type: String
  },
  description: {
    type: String
  },
  facebookText: {
    type: String
  },
  instagramText: {
    type: String
  },
  twitterText: {
    type: String
  },
  youtubeText: {
    type: String
  },
  tiktokText: {
    type: String
  },
  hashtags: {
    type: [String]
  },
  mentions: {
    type: [String]
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  externalLink: {
    type: String
  },
  location: {
    type: String
  },
  bountyOffered: {
    type: Number
  },
  challengeHashTag: {
    type: String,
    unique: true
  },
  participants: {
    type: Array
  }
})

ChallengeSchema.methods = {
  getChallengeById: async function (challengeId) {
    const Challenge = mongoose.model('Challenge')
    let query = { _id: challengeId }
    const options = {
      criteria: query
    }
    return Challenge.load(options)
  },
  getAllChallenges: async function () {
    const Challenge = mongoose.model('Challenge')
    return Challenge.find({})
      .populate({
        path: 'brand',
        select: '_id name logo'
      })
      .sort({ endDate: 1 })
  },
  updateChallengesById: async function (challengeId, data) {
    const Challenge = mongoose.model('Challenge')
    return Challenge.findByIdAndUpdate(
      challengeId,
      {
        $set: data
      },
      {
        new: true
      }
    )
  },
  getChallengeDetails: async function (challengeId) {
    const Challenge = mongoose.model('Challenge')
    return Challenge.findOne({ _id: challengeId })
      .populate({
        path: 'brand',
        select: '_id name logo'
      })
  },
  updateChallengeParticipants: async function(challengeId, participant) {
    const Challenge = mongoose.model('Challenge')
    return Challenge.findByIdAndUpdate(
      challengeId,
      { $addToSet: { participants: participant } },
      {
        new: true
      }
    )
  }
}

ChallengeSchema.statics = {
  load: function (options, cb) {
    options.select =
      options.select ||
      'title description facebookText instagramText tiktokText youtubeText twitterText hashtags mentions  startDate endDate externalLink location  bountyOffered challengeHashTag participants'
    return this.findOne(options.criteria).select(options.select).exec(cb)
  },

  list: function (options) {
    const criteria = options.criteria || {}
    const page = options.page - 1
    const limit = parseInt(options.limit) || 12
    const select =
      options.select ||
      'title description facebookText instagramText tiktokText youtubeText twitterText hashtags mentions  startDate endDate externalLink location  bountyOffered challengeHashTag participants'
    return this.find(criteria)
      .select(select)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(limit * page)
      .lean()
      .exec()
  }
}

module.exports = mongoose.model('Challenge', ChallengeSchema)
