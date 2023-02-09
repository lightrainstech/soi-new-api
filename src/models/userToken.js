'use strict'
// External Dependencies
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId
const { stripTrailingSlash } = require('../utils/soi')

const UserTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    nftId: { type: String, unique: true, required: true },
    avatar: {
      type: String
    },
    thumbnail: {
      type: String
    },
    social: {
      facebook: {
        name: String,
        handle: String,
        socialInsiderId: String,
        followers: {
          type: Number,
          default: 0
        }
      },
      twitter: {
        name: String,
        handle: String,
        socialInsiderId: String,
        followers: {
          type: Number,
          default: 0
        }
      },
      youtube: {
        name: String,
        handle: String,
        socialInsiderId: String,
        followers: {
          type: Number,
          default: 0
        }
      },
      instagram: {
        name: String,
        handle: String,
        socialInsiderId: String,
        followers: {
          type: Number,
          default: 0
        }
      },
      tiktok: {
        name: String,
        handle: String,
        socialInsiderId: String,
        followers: {
          type: Number,
          default: 0
        }
      }
    }
  },
  { timestamps: true }
)

let val1,
  val2,
  val3,
  val4,
  key,
  key1,
  key2,
  key3,
  key4,
  obj = {}
const socialAccountMap = {
  facebook: 'facebook',
  instagram: 'instagram',
  twitter: 'twitter',
  youtube: 'youtube',
  tiktok: 'tiktok'
}

UserTokenSchema.methods = {
  getUserTokenById: async function (nftId, userId) {
    const UserToken = mongoose.model('UserToken')
    let query = { nftId: nftId, user: ObjectId(userId) }
    const options = {
      criteria: query
    }
    return UserToken.load(options)
  },
  listUserTokens: async function (userId, page) {
    const UserToken = mongoose.model('UserToken')
    let query = { user: ObjectId(userId) }
    const options = {
      criteria: query,
      page: page
    }
    return UserToken.list(options)
  },
  getUserTokenByUserId: async function (userId) {
    const UserToken = mongoose.model('UserToken')
    let query = { user: ObjectId(userId) }
    const options = {
      criteria: query
    }
    return UserToken.load(options)
  },
  updateSocialAccounts: async function (nftId, socialAccounts, resData) {
    const UserToken = mongoose.model('UserToken')
    const firstKey = Object.keys(socialAccounts)[0]
    if (socialAccountMap[firstKey]) {
      val1 = stripTrailingSlash(socialAccounts[firstKey])
      key1 = `social.${firstKey}.handle`
      key2 = `social.${firstKey}.socialInsiderId`
      val2 = resData.id
      key3 = `social.${firstKey}.name`
      val3 = resData.name
      key4 = `social.${firstKey}.followers`
      val4 = resData.followers
    }
    const result = UserToken.findOneAndUpdate(
      { nftId: nftId },
      { [key1]: val1, [key2]: val2, [key3]: val3, [key4]: val4 },
      {
        new: true
      }
    )
    return result
  },
  checkSocialAccountExists: async function (socialAccounts) {
    const UserToken = mongoose.model('UserToken')
    const firstKey = Object.keys(socialAccounts)[0]
    if (socialAccountMap[firstKey]) {
      obj = stripTrailingSlash(socialAccounts[firstKey])
      key = `social.${firstKey}.handle`
    }
    return UserToken.findOne({ [key]: obj }).select(
      'user avatar thumbnail nftId social'
    )
  },
  removeAccount: async function (socialAccounts, userId, nftId) {
    const UserToken = mongoose.model('UserToken')
    const firstKey = Object.keys(socialAccounts)[0]
    if (socialAccountMap[firstKey]) {
      obj = stripTrailingSlash(socialAccounts[firstKey])
      key = `social.${firstKey}`
    }
    return UserToken.findOneAndUpdate(
      { user: ObjectId(userId), nftId: nftId },
      { $unset: { [key]: '' } },
      {
        new: true
      }
    )
  },
  getTotalFollowersInDifferentPlatform: async function () {
    console.log('gagag')
    const UserToken = mongoose.model('UserToken')
    return UserToken.aggregate([
      {
        $project: {
          social: 1,
          totalFollowers: {
            $sum: [
              '$social.facebook.followers',
              '$social.twitter.followers',
              '$social.youtube.followers',
              '$social.instagram.followers',
              '$social.tiktok.followers'
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          facebookFollowers: { $sum: '$social.facebook.followers' },
          twitterFollowers: { $sum: '$social.twitter.followers' },
          youtubeFollowers: { $sum: '$social.youtube.followers' },
          instagramFollowers: { $sum: '$social.instagram.followers' },
          tiktokFollowers: { $sum: '$social.tiktok.followers' },
          totalFollowers: { $sum: '$totalFollowers' }
        }
      }
    ])
  }
}

UserTokenSchema.statics = {
  load: function (options, cb) {
    options.select = options.select || 'user avatar thumbnail nftId social'
    return this.findOne(options.criteria).select(options.select).exec(cb)
  },

  list: function (options) {
    const criteria = options.criteria || {}
    const page = options.page - 1
    const limit = parseInt(options.limit) || 12
    const select =
      options.select || 'user avatar thumbnail nftId social createdAt'
    return this.find(criteria)
      .select(select)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(limit * page)
      .lean()
      .exec()
  }
}

UserTokenSchema.index({ user: 1 })

module.exports = mongoose.model('UserToken', UserTokenSchema)
