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
    social: {
      facebook: {
        name: String,
        handle: String,
        socialInsiderId: String
      },
      twitter: {
        name: String,
        handle: String,
        socialInsiderId: String
      },
      youtube: {
        name: String,
        handle: String,
        socialInsiderId: String
      },
      instagram: {
        name: String,
        handle: String,
        socialInsiderId: String
      },
      tiktok: {
        name: String,
        handle: String,
        socialInsiderId: String
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
  obj = {}
let key, key1, key2, key3
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
      select: 'email userName wallet role avatar social name'
    }
    return User.load(options)
  },
  getUserByEmail: async function (email) {
    const User = mongoose.model('User')
    let query = { email }
    const options = {
      criteria: query,
      select: 'email userName wallet role avatar social name'
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
      criteria: query
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
    }
    const result = User.findOneAndUpdate(
      { wallet: wallet },
      { [key1]: val1, [key2]: val2, [key3]: val3 },
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
  getProfileDetails: async function (wallet) {
    const User = mongoose.model('User')
    return await User.aggregate([
      {
        $match: {
          wallet: wallet
        }
      },
      {
        $lookup: {
          from: 'usertokens',
          localField: '_id',
          foreignField: 'user',
          as: 'nftDetails'
        }
      },
      {
        $project: {
          _id: 1,
          userName: 1,
          name: 1,
          phone: 1,
          wallet: 1,
          avatar: 1,
          nftDetails: 1,
          email: 1,
          role: 1
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
