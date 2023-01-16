'use strict'
// External Dependencies
const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')
const { customAlphabet } = require('nanoid')
const nanoidLong = customAlphabet(
  '5eDVbMmnXU9GRaF3H4Cl2vwSzYsqfrLdyOIKWZ78hkJPgTN6xEjcQtABpu',
  8
)
const { stripTrailingSlash } = require('../utils/soi')

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true
    },
    userName: {
      type: String,
      required: true,
      unique: true
    },
    name: { type: String, required: true },
    phone: { type: String, default: '--' },
    country: { type: String, default: '--' },
    wallet: { type: String, required: true, unique: true },
    affiliateCode: { type: String, default: null },
    isRestricted: {
      type: Boolean,
      default: false
    },
    role: {
      type: String,
      enum: ['user', 'influencer', 'agency'],
      default: 'user'
    },
    avatar: {
      type: String
    },
    bannerImage: {
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
  {
    timestamps: true
  }
)

UserSchema.pre('save', async function (next) {
  this.affiliateCode = nanoidLong()
  next()
})

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

;(UserSchema.methods = {
  getUserById: async function (id) {
    const User = mongoose.model('User')
    let query = { _id: id }
    const options = {
      criteria: query,
      select: 'email userName wallet role avatar bannerImage social name country phone'
    }
    return User.load(options)
  },
  getUserByEmail: async function (email) {
    const User = mongoose.model('User')
    let query = { email }
    const options = {
      criteria: query,
      select:
        'email userName wallet role avatar bannerImage social name country phone'
    }
    return User.load(options)
  },
  getActiveUserByEmail: async function (email) {
    const User = mongoose.model('User')
    let query = { email, isRestricted: false }
    const options = {
      criteria: query,
      select: 'email hashed_password name'
    }
    return User.load(options)
  },
  getUserBywallet: async function (wallet) {
    const User = mongoose.model('User')
    let query = { wallet }
    const options = {
      criteria: query,
      select:
        'email userName wallet role avatar bannerImage social name country phone'
    }
    return await User.load(options)
  },
  updateSocialAccounts: async function (wallet, socialAccounts, resData) {
    const User = mongoose.model('User')
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
    const result = User.findOneAndUpdate(
      { wallet: wallet },
      { [key1]: val1, [key2]: val2, [key3]: val3, [key4]: val4 },
      {
        new: true
      }
    )
    return result
  },
  checkSocialAccountExists: async function (socialAccounts) {
    const User = mongoose.model('User')
    const firstKey = Object.keys(socialAccounts)[0]
    if (socialAccountMap[firstKey]) {
      obj = stripTrailingSlash(socialAccounts[firstKey])
      key = `social.${firstKey}.handle`
    }
    return User.findOne({ [key]: obj }).select('email name userName social')
  },
  getUserByUsername: async function (userName) {
    const User = mongoose.model('User')
    let query = { userName }
    const options = {
      criteria: query
    }
    return User.load(options)
  },
  checkAffiliateCode: async function (affCode) {
    const User = mongoose.model('User')
    let query = { affiliateCode: affCode }
    const options = {
      criteria: query
    }
    return User.load(options)
  },
  updateProfile: async function (userId, updateObj) {
    const User = mongoose.model('User')
    let data = await User.findOneAndUpdate(
      { _id: userId },
      { $set: updateObj },
      { new: true }
    )
    return data
  },
  removeAccount: async function (socialAccounts, userId) {
    const User = mongoose.model('User')
    const firstKey = Object.keys(socialAccounts)[0]
    if (socialAccountMap[firstKey]) {
      obj = stripTrailingSlash(socialAccounts[firstKey])
      key = `social.${firstKey}`
    }
    return User.findByIdAndUpdate(
      { _id: userId },
      { $unset: { [key]: '' } },
      {
        new: true
      }
    )
  },
  getCount: async function (role) {
    const User = mongoose.model('User')
    return User.count({
      role: role
    })
  },
  updateFollowers: async function (userId, data ) {
    const User = mongoose.model('User')
    return User.findByIdAndUpdate(
      { _id: userId },
      { $set: data },
      {
        new: true
      })
  },
  getTotalFollowersInDifferentPlatform: async function (userId, data ) {
    const User = mongoose.model('User')
    return User.aggregate([
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
}),
  (UserSchema.statics = {
    load: function (options, cb) {
      options.select = options.select || 'email name'
      return this.findOne(options.criteria).select(options.select).exec(cb)
    },

    list: function (options) {
      const criteria = options.criteria || {}
      const page = options.page - 1
      const limit = parseInt(options.limit) || 12
      const select =
        options.select || 'email name isVerified wallet createdAt -__v'
      return this.find(criteria)
        .select(select)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(limit * page)
        .lean()
        .exec()
    }
  })

UserSchema.index({ email: 1 }, { unique: true })

UserSchema.plugin(uniqueValidator)

module.exports = mongoose.model('User', UserSchema)
