'use strict'
// External Dependencies
const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')
const { customAlphabet } = require('nanoid')
const nanoidLong = customAlphabet(
  '5eDVbMmnXU9GRaF3H4Cl2vwSzYsqfrLdyOIKWZ78hkJPgTN6xEjcQtABpu',
  8
)

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
    social: {
      facebook: {
        type: String
      },
      twitter: {
        type: String
      },
      youtube: {
        type: String
      },
      instagram: {
        type: String
      },
      tiktok: {
        type: String
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

let obj = {}
let key
const socialAccountMap = {
  facebook: 'facebook',
  instagram: 'instagram',
  twitter: 'twitter',
  youtube: 'youtube',
  tiktok: 'tiktok'
}

UserSchema.methods = {
  getUserById: async function (id) {
    const User = mongoose.model('User')
    let query = { _id: id }
    const options = {
      criteria: query
    }
    return User.load(options)
  },
  getUserByEmail: async function (email) {
    const User = mongoose.model('User')
    let query = { email }
    const options = {
      criteria: query
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
    return User.load(options)
  },
  getUserByUserNameOrEmail: async function (userName, email) {
    const User = mongoose.model('User')
    let query = {
      $or: [
        {
          userName: userName
        },
        {
          email: email
        }
      ]
    }
    const options = {
      criteria: query,
      select: 'email name userName'
    }
    return User.load(options)
  },
  updateSocialAccounts: async function (wallet, socialAccounts) {
    const User = mongoose.model('User')

    const firstKey = Object.keys(socialAccounts)[0]
    if (socialAccountMap[firstKey]) {
      //obj = ` ${[socialAccountMap[firstKey]]}${socialAccounts[firstKey]}`
      obj = `${socialAccounts[firstKey]}`
      key = `social.${firstKey}`
    }
    const result = User.findOneAndUpdate(
      { wallet: wallet },
      { [key]: obj },
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
      //obj = ` ${[socialAccountMap[firstKey]]}${socialAccounts[firstKey]}`
      obj = `${socialAccounts[firstKey]}`
      key = `social.${firstKey}`
    }
    return User.findOne({ [key]: obj }).select('email name userName social')
  }
}

UserSchema.statics = {
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
}

UserSchema.index({ email: 1 }, { unique: true })

UserSchema.plugin(uniqueValidator)

module.exports = mongoose.model('User', UserSchema)
