'use strict'

const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId

const ChallengeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
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
    bountyOffered: {
      type: Number
    },
    challengeHashTag: {
      type: String,
      unique: true
    },
    participants: {
      type: Array,
      default: []
    },
    challengeIdentifier: {
      type: String
    },
    locations: {
      type: Array,
      default: []
    },
    participantsHashTags: {
      type: Array,
      default: []
    },
    challengeAddress: {
      type: String,
      default: null
    },
    isFunded: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['created', 'started', 'cancelled', 'completed'],
      default: 'created'
    }
  },
  {
    timestamps: true
  }
)

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
        path: 'user',
        select: '_id name avatar'
      })
      .sort({ endDate: -1 })
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
    return Challenge.findOne({ _id: challengeId }).populate({
      path: 'user',
      select: '_id name avatar'
    })
  },
  updateChallengeParticipants: async function (
    challengeId,
    participant,
    hashTag
  ) {
    const Challenge = mongoose.model('Challenge')
    return Challenge.findByIdAndUpdate(
      challengeId,
      {
        $addToSet: {
          participants: {
            id: participant,
            hashTag: hashTag
          },
          participantsHashTags: hashTag
        }
      },
      {
        new: true
      }
    )
  },
  getChallengeByTitle: async function (challengeTitle) {
    const Challenge = mongoose.model('Challenge')
    let query = { title: challengeTitle }
    const options = {
      criteria: query
    }
    return Challenge.load(options)
  },
  getAllChallengesByBrand: async function (userId) {
    const Challenge = mongoose.model('Challenge')
    return Challenge.find({
      user: userId
    })
      .populate({
        path: 'user',
        select: '_id name avatar'
      })
      .sort({ endDate: -1 })
  },
  getTotalChallengesCount: async function (userId) {
    const Challenge = mongoose.model('Challenge')
    const result = await Challenge.aggregate([
      {
        $group: {
          _id: null,
          totalChallenges: { $sum: 1 },
          totalChallengesByBrand: {
            $sum: {
              $cond: [{ $eq: ['$user', ObjectId(userId)] }, 1, 0]
            }
          },
          totalInfluencerParticipation: {
            $sum: { $size: '$participants' }
          }
        }
      }
    ])
    return {
      totalChallenges: result[0].totalChallenges,
      totalChallengesByBrand: result[0].totalChallengesByBrand,
      totalInfluencerParticipation: result[0].totalInfluencerParticipation
    }
  },
  updateFundStatus: async function (challengeId, bountyOffered) {
    const Challenge = mongoose.model('Challenge')
    return Challenge.findByIdAndUpdate(
      challengeId,
      {
        $set: {
          bountyOffered: bountyOffered,
          isFunded: true
        }
      },
      {
        new: true
      }
    )
  },
  updateChallengeAddress: async function (challengeId, challengeAddress) {
    const Challenge = mongoose.model('Challenge')
    return Challenge.findByIdAndUpdate(
      challengeId,
      {
        $set: {
          challengeAddress: challengeAddress
        }
      },
      {
        new: true
      }
    )
  },
  updateChallengeStatus: async function (challengeId, status) {
    const Challenge = mongoose.model('Challenge')
    return Challenge.findByIdAndUpdate(
      challengeId,
      {
        $set: {
          status: status
        }
      },
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
      'title description facebookText instagramText tiktokText youtubeText twitterText hashtags mentions  startDate endDate externalLink   bountyOffered challengeHashTag participants user  challengeIdentifier locations participantsHashTags challengeAddress isFunded status'
    return this.findOne(options.criteria).select(options.select).exec(cb)
  },

  list: function (options) {
    const criteria = options.criteria || {}
    const page = options.page - 1
    const limit = parseInt(options.limit) || 12
    const select =
      options.select ||
      'title description facebookText instagramText tiktokText youtubeText twitterText hashtags mentions  startDate endDate externalLink   bountyOffered challengeHashTag participants user  challengeIdentifier locations participantsHashTags challengeAddress isFunded status'
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
