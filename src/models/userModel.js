'use strict'
// External Dependencies
const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')
const { customAlphabet } = require('nanoid')
const nanoidLong = customAlphabet(
  '5eDVbMmnXU9GRaF3H4Cl2vwSzYsqfrLdyOIKWZ78hkJPgTN6xEjcQtABpu',
  8
)
const ObjectId = mongoose.Types.ObjectId

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


;(UserSchema.methods = {
  getUserById: async function (id) {
    const User = mongoose.model('User')
    let query = { _id: id }
    const options = {
      criteria: query,
      select:
        'email userName wallet role avatar bannerImage social name country phone'
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
  getCount: async function (role) {
    const User = mongoose.model('User')
    return User.count({
      role: role
    })
  },
  getUserProfileDetails: async function (userId) {
    const User = mongoose.model('User')
    const userDetails = User.aggregate([
      {
        $match: {
          _id: ObjectId(userId)
        }
      },
      {
        $lookup: {
          from: 'usertokens',
          localField: '_id',
          foreignField: 'user',
          as: 'activeNFT'
        }
      },
      {
        $unwind: '$activeNFT'
      },
      {
        $match: { 'activeNFT.isActive': true }
      }
    ])
    return userDetails
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
