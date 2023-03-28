'use strict'

const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId

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
    facebook: {
      likes: {
        type: Number,
        default: 0
      },
      shares: {
        type: Number,
        default: 0
      }
    },
    instagram: {
      likes: {
        type: Number,
        default: 0
      },
      shares: {
        type: Number,
        default: 0
      }
    },
    youtube: {
      likes: {
        type: Number,
        default: 0
      },
      shares: {
        type: Number,
        default: 0
      }
    },
    tiktok: {
      likes: {
        type: Number,
        default: 0
      },
      shares: {
        type: Number,
        default: 0
      }
    },
    twitter: {
      likes: {
        type: Number,
        default: 0
      },
      shares: {
        type: Number,
        default: 0
      }
    }
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
          challenge: ObjectId(challengeId),
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
    value2
  ) {
    const ChallengeParticipation = mongoose.model('ChallengeParticipation')
    return ChallengeParticipation.findOneAndUpdate(
      { challenge: challengeId, user: userId },
      { $set: { [key1]: value1, [key2]: value2, isActive: false } },
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
