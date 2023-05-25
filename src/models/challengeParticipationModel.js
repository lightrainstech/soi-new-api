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
  },
  video_views: {
    type: Number,
    default: 0
  },
  totalPostsPrice: {
    type: Number,
    default: 0
  },
  totalSharesPrice: {
    type: Number,
    default: 0
  },
  totalLikesPrice: {
    type: Number,
    default: 0
  },
  totalCommentsPrice: {
    type: Number,
    default: 0
  },
  totalViewsPrice: {
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
          totalPosts: {
            $add: [
              { $ifNull: ['$social.facebook.totalPosts', 0] },
              { $ifNull: ['$social.instagram.totalPosts', 0] },
              { $ifNull: ['$social.youtube.totalPosts', 0] },
              { $ifNull: ['$social.tiktok.totalPosts', 0] },
              { $ifNull: ['$social.twitter.totalPosts', 0] }
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
        $addFields: {
          totalFacebookPosts: { $ifNull: ['$social.facebook.totalPosts', 0] },
          totalInstagramPosts: { $ifNull: ['$social.instagram.totalPosts', 0] },
          totalYouTubePosts: { $ifNull: ['$social.youtube.totalPosts', 0] },
          totalTikTokPosts: { $ifNull: ['$social.tiktok.totalPosts', 0] },
          totalTwitterPosts: { $ifNull: ['$social.twitter.totalPosts', 0] },
          totalFacebookShares: { $ifNull: ['$social.facebook.shares', 0] },
          totalInstagramShares: { $ifNull: ['$social.instagram.shares', 0] },
          totalYouTubeShares: { $ifNull: ['$social.youtube.shares', 0] },
          totalTikTokShares: { $ifNull: ['$social.tiktok.shares', 0] },
          totalTwitterShares: { $ifNull: ['$social.twitter.shares', 0] }
        }
      },
      {
        $group: {
          _id: '$team',
          totalPosts: { $sum: '$totalPosts' },
          totalShares: { $sum: '$totalShares' },
          totalFacebookPosts: { $sum: '$totalFacebookPosts' },
          totalInstagramPosts: { $sum: '$totalInstagramPosts' },
          totalYouTubePosts: { $sum: '$totalYouTubePosts' },
          totalTikTokPosts: { $sum: '$totalTikTokPosts' },
          totalTwitterPosts: { $sum: '$totalTwitterPosts' },
          totalFacebookShares: { $sum: '$totalFacebookShares' },
          totalInstagramShares: { $sum: '$totalInstagramShares' },
          totalYouTubeShares: { $sum: '$totalYouTubeShares' },
          totalTikTokShares: { $sum: '$totalTikTokShares' },
          totalTwitterShares: { $sum: '$totalTwitterShares' },
          totalBounty: { $sum: '$bountyReceived' },
          members: {
            $push: {
              user: '$user',
              challenge: '$challenge',
              hashTag: '$hashTag',
              isActive: '$isActive',
              nftId: '$nftId'
            }
          }
        }
      },
      {
        $sort: {
          totalPosts: -1
        }
      },
      {
        $sort: {
          totalShares: -1
        }
      },
      {
        $sort: {
          totalBounty: -1
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
    value7,
    key8,
    value8,
    key9,
    value9,
    key10,
    value10,
    key11,
    value11,
    key12,
    value12,
    key13,
    value13
  ) {
    const ChallengeParticipation = mongoose.model('ChallengeParticipation')
    return ChallengeParticipation.findOneAndUpdate(
      { challenge: challengeId, user: userId },
      [
        {
          $set: {
            [key1]: value1,
            [key2]: value2,
            [key3]: value3,
            [key4]: value4,
            [key5]: value5,
            [key6]: value6,
            [key7]: value7,
            [key8]: value8,
            [key9]: value9,
            [key10]: value10,
            [key11]: value11,
            [key12]: value12,
            [key13]: value13,
            isActive: false
          }
        },
        {
          $set: {
            bountyReceived: {
              $sum: [
                '$social.facebook.totalPostsPrice',
                '$social.facebook.totalSharesPrice',
                '$social.facebook.totalLikesPrice',
                '$social.facebook.totalViewsPrice',
                '$social.facebook.totalCommentsPrice',

                '$social.instagram.totalPostsPrice',
                '$social.instagram.totalSharesPrice',
                '$social.instagram.totalLikesPrice',
                '$social.instagram.totalCommentsPrice',
                '$social.instagram.totalViewsPrice',

                '$social.youtube.totalPostsPrice',
                '$social.youtube.totalSharesPrice',
                '$social.youtube.totalLikesPrice',
                '$social.youtube.totalCommentsPrice',
                '$social.youtube.totalViewsPrice',

                '$social.tiktok.totalPostsPrice',
                '$social.tiktok.totalSharesPrice',
                '$social.tiktok.totalLikesPrice',
                '$social.tiktok.totalCommentsPrice',
                '$social.tiktok.totalViewsPrice',

                '$social.twitter.totalPostsPrice',
                '$social.twitter.totalSharesPrice',
                '$social.twitter.totalLikesPrice',
                '$social.twitter.totalCommentsPrice',
                '$social.twitter.totalViewsPrice'
              ]
            }
          }
        }
      ],
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
  },
  getTeamLeaderBoard: async function (challengeId, limit) {
    const ChallengeParticipation = mongoose.model('ChallengeParticipation')
    const pipeline = [
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
          'challengeDetails.user': ObjectId(challengeId)
        }
      },
      {
        $group: {
          _id: '$team',
          totalBounty: { $sum: '$bountyReceived' }
        }
      },
      {
        $sort: {
          totalBounty: -1
        }
      }
    ]
    if (limit > 0) {
      pipeline.push({
        $limit: limit
      })
    }
    const result = await ChallengeParticipation.aggregate(pipeline)
    return result
  },
  updateBountyReceived: async function (_id, bountyReceived) {
    const ChallengeParticipation = mongoose.model('ChallengeParticipation')
    return ChallengeParticipation.findByIdAndUpdate(
      _id,
      {
        $set: {
          bountyReceived: bountyReceived
        }
      },
      {
        new: true
      }
    )
  },
  getUserBountyReceived: async function (challengeId) {
    const ChallengeParticipation = mongoose.model('ChallengeParticipation')
    const pipeline = [
      { $match: { challenge: mongoose.Types.ObjectId(challengeId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          initialBounty: {
            $add: [
              { $ifNull: ['$social.facebook.totalPostsPrice', 0] },
              { $ifNull: ['$social.facebook.totalSharesPrice', 0] },
              { $ifNull: ['$social.facebook.totalLikesPrice', 0] },
              { $ifNull: ['$social.facebook.totalViewsPrice', 0] },
              { $ifNull: ['$social.facebook.totalCommentsPrice', 0] },

              { $ifNull: ['$social.instagram.totalPostsPrice', 0] },
              { $ifNull: ['$social.instagram.totalSharesPrice', 0] },
              { $ifNull: ['$social.instagram.totalLikesPrice', 0] },
              { $ifNull: ['$social.instagram.totalViewsPrice', 0] },
              { $ifNull: ['$social.instagram.totalCommentsPrice', 0] },

              { $ifNull: ['$social.twitter.totalPostsPrice', 0] },
              { $ifNull: ['$social.twitter.totalSharesPrice', 0] },
              { $ifNull: ['$social.twitter.totalLikesPrice', 0] },
              { $ifNull: ['$social.twitter.totalViewsPrice', 0] },
              { $ifNull: ['$social.twitter.totalCommentsPrice', 0] },

              { $ifNull: ['$social.youtube.totalPostsPrice', 0] },
              { $ifNull: ['$social.youtube.totalSharesPrice', 0] },
              { $ifNull: ['$social.youtube.totalLikesPrice', 0] },
              { $ifNull: ['$social.youtube.totalViewsPrice', 0] },
              { $ifNull: ['$social.youtube.totalCommentsPrice', 0] },

              { $ifNull: ['$social.tiktok.totalPostsPrice', 0] },
              { $ifNull: ['$social.tiktok.totalSharesPrice', 0] },
              { $ifNull: ['$social.tiktok.totalLikesPrice', 0] },
              { $ifNull: ['$social.tiktok.totalViewsPrice', 0] },
              { $ifNull: ['$social.tiktok.totalCommentsPrice', 0] }
            ]
          }
        }
      },
      {
        $group: {
          _id: '$_id',
          user: { $first: '$user._id' },
          name: { $first: '$user.name' },
          wallet: { $first: '$user.wallet' },
          bountyReceived: { $first: '$bountyReceived' },
          postMetrics: { $first: '$social' },
          initialBounty: {
            $sum: '$initialBounty'
          }
        }
      },
      {
        $group: {
          _id: null,
          totalBountyAllUsers: { $sum: '$bountyReceived' },
          userTotals: {
            $push: {
              _id: '$_id',
              userId: '$user',
              name: '$name',
              wallet: '$wallet',
              userTotal: '$bountyReceived',
              postMetrics: '$postMetrics',
              initialBounty: '$initialBounty'
            }
          }
        }
      }
    ]
    const result = await ChallengeParticipation.aggregate(pipeline).option({
      lean: true
    })
    return result[0]
  }
}

module.exports = mongoose.model(
  'ChallengeParticipation',
  ChallengeParticipationSchema
)
