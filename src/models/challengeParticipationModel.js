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
        $group: {
          _id: '$team',
          totalLikes: {
            $sum: {
              $add: [
                '$social.facebook.likes',
                '$social.instagram.likes',
                '$social.youtube.likes',
                '$social.tiktok.likes',
                '$social.twitter.likes'
              ]
            }
          },
          totalShares: {
            $sum: {
              $add: [
                '$social.facebook.shares',
                '$social.instagram.shares',
                '$social.youtube.shares',
                '$social.tiktok.shares',
                '$social.twitter.shares'
              ]
            }
          },
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
      },
      {
        $limit: 1
      }
    ])
    return result
  },
  updatePostData: async function (challengeId, key1, value1, key2, value2) {
    const ChallengeParticipation = mongoose.model('ChallengeParticipation')
      return ChallengeParticipation.findOneAndUpdate(
        { challenge: challengeId },
        { $set: { [key1]: value1, [key2]: value2 } },
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
