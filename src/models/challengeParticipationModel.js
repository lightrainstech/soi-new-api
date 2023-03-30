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
  totalPosts: {
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
  },
  bountyReceived: {
    type: Number,
    default: 0
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
  },
  calculatePostMetrics: async function (brandId) {
    const ChallengeParticipation = mongoose.model('ChallengeParticipation')
    const result = await ChallengeParticipation.aggregate([
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
          'challengeDetails.user': ObjectId(brandId)
        }
      },
      {
        $addFields: {
          totalImpressions: {
            $add: [
              { $ifNull: ['$social.facebook.impressions', 0] },
              { $ifNull: ['$social.instagram.impressions', 0] },
              { $ifNull: ['$social.youtube.impressions', 0] },
              { $ifNull: ['$social.tiktok.impressions', 0] },
              { $ifNull: ['$social.twitter.impressions', 0] }
            ]
          },
          totalEngagements: {
            $add: [
              { $ifNull: ['$social.facebook.engagement', 0] },
              { $ifNull: ['$social.instagram.engagement', 0] },
              { $ifNull: ['$social.youtube.engagement', 0] },
              { $ifNull: ['$social.tiktok.engagement', 0] },
              { $ifNull: ['$social.twitter.engagement', 0] }
            ]
          },
          totalPosts: {
            $add: [
              { $ifNull: ['$social.facebook.totalPosts', 0] },
              { $ifNull: ['$social.instagram.totalPosts', 0] },
              { $ifNull: ['$social.youtube.totalPosts', 0] },
              { $ifNull: ['$social.tiktok.totalPosts', 0] },
              { $ifNull: ['$social.twitter.totalPosts', 0] }
            ]
          },
          totalPostEngagementRate: {
            $add: [
              { $ifNull: ['$social.facebook.post_engagement_rate', 0] },
              { $ifNull: ['$social.instagram.post_engagement_rate', 0] },
              { $ifNull: ['$social.youtube.post_engagement_rate', 0] },
              { $ifNull: ['$social.tiktok.post_engagement_rate', 0] },
              { $ifNull: ['$social.twitter.post_engagement_rate', 0] }
            ]
          }
        }
      },
      {
        $group: {
          _id: 'null',
          totalImpressions: { $sum: '$totalImpressions' },
          totalEngagements: { $sum: '$totalEngagements' },
          totalPosts: { $sum: '$totalPosts' },
          totalBounty: {
            $sum: '$bountyReceived'
          },
          totalPostEngagementRate: { $sum: '$totalPostEngagementRate' }
        }
      }
    ])
    return {
      totalImpressions: result[0]?.totalImpressions ?? 0,
      totalEngagements: result[0]?.totalEngagements ?? 0,
      totalPosts: result[0]?.totalPosts ?? 0,
      totalBounty: result[0]?.totalBounty ?? 0,
      totalPostEngagementRate: result[0]?.totalPostEngagementRate ?? 0
    }
  }
}

module.exports = mongoose.model(
  'ChallengeParticipation',
  ChallengeParticipationSchema
)
