'use strict'

const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId

const socialStatusSchema = {
  likes: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  comments: {
    type: Number,
    default: 0
  },
  engagement: {
    type: Number,
    default: 0
  },
  post_engagement_rate: {
    type: Number,
    default: 0
  },
  impressions: {
    type: Number,
    default: 0
  },
  totalPost: {
    type: Number,
    default: 0
  }
}

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
  },
  social: {
    facebook: socialStatusSchema,
    instagram: socialStatusSchema,
    youtube: socialStatusSchema,
    tiktok: socialStatusSchema,
    twitter: socialStatusSchema
  }
})

ChallengeParticipationSchema.methods = {
  getParticipationDetails: async function (userId, nftId) {
    const ChallengeParticipation = mongoose.model('ChallengeParticipation')
    return ChallengeParticipation.aggregate([
      {
        $lookup: {
          from: 'challenges',
          localField: 'challenge',
          foreignField: '_id',
          as: 'challengeDetails'
        }
      },
      {
        $match: {
          user: ObjectId(userId),
          nftId: nftId,
          isActive: true,
          'challengeDetails.endDate': {
            $gte: new Date()
          }
        }
      }
    ])
  },
  getChallengeParticipantsByTeam: async function (challengeId) {
    const ChallengeParticipation = mongoose.model('ChallengeParticipation')
    const result = await ChallengeParticipation.aggregate([
      {
        $match: {
          challenge: ObjectId(challengeId)
        }
      },
      {
        $lookup: {
          from: 'usertokens',
          localField: 'nftId',
          foreignField: 'nftId',
          as: 'nft'
        }
      },
      {
        $unwind: {
          path: '$nft',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          totalLikes: {
            $add: [
              { $ifNull: ['$social.facebook.likes', 0] },
              { $ifNull: ['$social.instagram.likes', 0] },
              { $ifNull: ['$social.youtube.likes', 0] },
              { $ifNull: ['$social.tiktok.likes', 0] },
              { $ifNull: ['$social.twitter.likes', 0] }
            ]
          },
          totalShares: {
            $add: [
              { $ifNull: ['$social.facebook.shares', 0] },
              { $ifNull: ['$social.instagram.shares', 0] },
              { $ifNull: ['$social.youtube.shares', 0] },
              { $ifNull: ['$social.tiktok.shares', 0] },
              { $ifNull: ['$social.twitter.shares', 0] }
            ]
          }
        }
      },
      {
        $group: {
          _id: '$team',
          totalLikes: { $sum: '$totalLikes' },
          totalShares: { $sum: '$totalShares' },
          members: {
            $push: {
              user: '$user',
              challenge: '$challenge',
              hashTag: '$hashTag',
              isActive: '$isActive',
              nftId: '$nftId',
              social: '$social',
              nft: '$nft'
            }
          }
        }
      },
      {
        $sort: {
          totalLikes: -1,
          totalShares: -1
        }
      }
    ])
    return result
  },
  getChallengeParticipants: async function (challengeId) {
    const ChallengeParticipation = mongoose.model('ChallengeParticipation')
    const result = ChallengeParticipation.aggregate([
      {
        $match: {
          challenge: ObjectId(challengeId)
        }
      },
      {
        $lookup: {
          from: 'usertokens',
          localField: 'nftId',
          foreignField: 'nftId',
          as: 'nft'
        }
      },
      {
        $unwind: {
          path: '$nft',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'challenges',
          localField: 'challenge',
          foreignField: '_id',
          as: 'challenge'
        }
      },
      {
        $unwind: {
          path: '$challenge',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          isActive: 1,
          user: 1,
          challenge: 1,
          hashTag: 1,
          nftId: 1,
          team: 1,
          'nft.social': 1
        }
      }
    ])
    return result
  },
  updatePostData: async function (
    challengeId,
    userId,
    key1,
    value1,
    key2,
    value2,
    key3,
    value3,
    key4,
    value4,
    key5,
    value5,
    key6,
    value6,
    key7,
    value7
  ) {
    const ChallengeParticipation = mongoose.model('ChallengeParticipation')
    return ChallengeParticipation.findOneAndUpdate(
      { challenge: challengeId, user: userId },
      {
        $set: {
          [key1]: value1,
          [key2]: value2,
          [key3]: value3,
          [key4]: value4,
          [key5]: value5,
          [key6]: value6,
          [key7]: value7,
          isActive: false
        }
      },
      {
        new: true
      }
    )
  }
}

module.exports = mongoose.model(
  'ChallengeParticipation',
  ChallengeParticipationSchema
)
