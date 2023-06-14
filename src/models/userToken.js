'use strict'
// External Dependencies
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId
const { stripTrailingSlash } = require('../utils/soi')
const { randomHashTag } = require('../utils/hashtag')

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
    name:{
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
    },
    isActive: {
      type: Boolean,
      default: false
    },
    owner:{
      type: String
    },
    creator: {
      type: String
    },
    tokenHashTag: {
      type: String
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
    console.log('db fields', {
      [key1]: val1,
      [key2]: val2,
      [key3]: val3,
      [key4]: val4
    })
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
  },
  listTokens: async function (userId) {
    const UserToken = mongoose.model('UserToken')
    let query = {
      user: ObjectId(userId),
      $or: [
        { 'social.facebook.socialInsiderId': { $exists: true } },
        { 'social.twitter.socialInsiderId': { $exists: true } },
        { 'social.youtube.socialInsiderId': { $exists: true } },
        { 'social.instagram.socialInsiderId': { $exists: true } },
        { 'social.tiktok.socialInsiderId': { $exists: true } }
      ]
    }
    const options = {
      criteria: query
    }
    return UserToken.find(options.criteria).select('_id user nftId social')
  },
  updateFollowers: async function (nftId, key, value) {
    const UserToken = mongoose.model('UserToken')
    if (value !== 0) {
      return UserToken.findOneAndUpdate(
        { nftId: nftId },
        { $set: { [key]: value } },
        {
          new: true
        }
      )
    } else {
      return UserToken.findOne({ nftId: nftId })
    }
  },
  markAsActive: async function (nftId, userId) {
    const UserToken = mongoose.model('UserToken')
    await UserToken.updateMany(
      { user: ObjectId(userId), nftId: { $ne: nftId }, isActive: true },
      { $set: { isActive: false } }
    )
    return UserToken.findOneAndUpdate(
      { nftId: nftId, user: ObjectId(userId) },
      { $set: { isActive: true } },
      {
        new: true
      }
    )
  },
  getUserSocialDetails: async function (userId) {
    const UserToken = mongoose.model('UserToken')
    const profiles = await UserToken.aggregate([
      {
        $match: {
          user: ObjectId(userId),
          $or: [
            { 'social.facebook.socialInsiderId': { $exists: true } },
            { 'social.twitter.socialInsiderId': { $exists: true } },
            { 'social.youtube.socialInsiderId': { $exists: true } },
            { 'social.instagram.socialInsiderId': { $exists: true } },
            { 'social.tiktok.socialInsiderId': { $exists: true } }
          ]
        }
      },
      {
        $project: {
          _id: 1,
          social: 1
        }
      },
      {
        $group: {
          _id: '_id',
          facebook: {
            $push: {
              name: '$social.facebook.name',
              handle: '$social.facebook.handle',
              socialInsiderId: '$social.facebook.socialInsiderId',
              followers: '$social.facebook.followers'
            }
          },
          youtube: {
            $push: {
              name: '$social.youtube.name',
              handle: '$social.youtube.handle',
              socialInsiderId: '$social.youtube.socialInsiderId',
              followers: '$social.youtube.followers'
            }
          },
          twitter: {
            $push: {
              name: '$social.twitter.name',
              handle: '$social.twitter.handle',
              socialInsiderId: '$social.twitter.socialInsiderId',
              followers: '$social.twitter.followers'
            }
          },
          tiktok: {
            $push: {
              name: '$social.tiktok.name',
              handle: '$social.tiktok.handle',
              socialInsiderId: '$social.tiktok.socialInsiderId',
              followers: '$social.tiktok.followers'
            }
          },
          instagram: {
            $push: {
              name: '$social.instagram.name',
              handle: '$social.instagram.handle',
              socialInsiderId: '$social.instagram.socialInsiderId',
              followers: '$social.instagram.followers'
            }
          }
        }
      }
    ])

    const optimizedConnectedProfiles = profiles.map(profile => {
      const cleanedProfile = {}
      Object.entries(profile).forEach(([key, value]) => {
        if (
          Array.isArray(value) &&
          value.length > 0
        ) {
          cleanedProfile[key] = value.filter(
            obj =>
              Object.keys(obj).length !== 0 &&
              obj['socialInsiderId'] !== undefined
          )
        }
      })
      return cleanedProfile
    })
    return optimizedConnectedProfiles[0]
  },
  getRecentlyMintedNFT: async function (userId) {
    const UserToken = mongoose.model('UserToken')
    return UserToken.findOne({
      user: ObjectId(userId),
      'social.facebook.socialInsiderId': { $exists: false },
      'social.twitter.socialInsiderId': { $exists: false },
      'social.youtube.socialInsiderId': { $exists: false },
      'social.instagram.socialInsiderId': { $exists: false },
      'social.tiktok.socialInsiderId': { $exists: false }
    })
      .sort({ createdAt: -1 })
      .limit(1)
  }
}

UserTokenSchema.statics = {
  load: function (options, cb) {
    options.select =
      options.select ||
      'user avatar name thumbnail nftId social isActive createdAt owner creator tokenHashTag'
    return this.findOne(options.criteria).select(options.select).exec(cb)
  },

  list: function (options) {
    const criteria = options.criteria || {}
    const page = options.page - 1
    const limit = parseInt(options.limit) || 12
    const select =
      options.select ||
      'user avatar name thumbnail nftId social isActive createdAt owner creator tokenHashTag'
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
