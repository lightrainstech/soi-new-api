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
      index: {
        unique: true,
        partialFilterExpression: {
          $or: [
            { userName: { $type: 'string' } },
            { userName: { $exists: false } }
          ]
        }
      },
      default: null
    },
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      default: '--'
    },
    country: {
      type: String,
      default: '--'
    },
    wallet: {
      type: String,
      required: true,
      unique: true
    },
    affiliateCode: {
      type: String,
      default: null
    },
    isRestricted: {
      type: Boolean,
      default: false
    },
    role: {
      type: String,
      enum: ['user', 'influencer', 'agency', 'sub-agency', 'brand'],
      default: 'user'
    },
    avatar: {
      type: String,
      default: null
    },
    bannerImage: {
      type: String,
      default: null
    },
    parent: {
      type: mongoose.Schema.ObjectId,
      default: null
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
UserSchema.methods = {
  getUserById: async function (id) {
    const User = mongoose.model('User')
    let query = { _id: id }
    const options = {
      criteria: query,
      select: 'email userName wallet role avatar bannerImage name country phone'
    }
    return User.load(options)
  },
  getUserByEmail: async function (email) {
    const User = mongoose.model('User')
    let query = { email }
    const options = {
      criteria: query,
      select: 'email userName wallet role avatar bannerImage name country phone'
    }
    return User.load(options)
  },
  getActiveUserByEmail: async function (email) {
    const User = mongoose.model('User')
    let query = { email, isRestricted: false }
    const options = {
      criteria: query,
      select: 'email  name'
    }
    return User.load(options)
  },
  getUserBywallet: async function (wallet) {
    const User = mongoose.model('User')
    let query = { wallet }
    const options = {
      criteria: query,
      select: 'email userName wallet role avatar bannerImage country phone'
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
  checkAffiliateCode: async function (agencyCode) {
    const User = mongoose.model('User')
    return await User.findOne({ affiliateCode: agencyCode })
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
    const userDetails = await User.aggregate([
      { $match: { _id: ObjectId(userId) } },
      {
        $lookup: {
          from: 'usertokens',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$user', '$$userId'] },
                    { $eq: ['$isActive', true] }
                  ]
                }
              }
            }
          ],
          as: 'activeNFT'
        }
      },
      { $unwind: { path: '$activeNFT', preserveNullAndEmptyArrays: true } },
      { $addFields: { activeNFT: { $ifNull: ['$activeNFT', {}] } } }
    ])
    return userDetails[0]
  },
  updateBannerOrAvatar: async function (userId, updateObj) {
    const User = mongoose.model('User')
    let data = await User.findOneAndUpdate(
      { _id: userId },
      { $set: updateObj },
      { new: true }
    )
    return data
  },
  getBrandByEmailOrWallet: async function (email, wallet) {
    const User = mongoose.model('User')
    let query = { $or: [{ email: email }, { wallet: wallet }], role: 'brand' }
    const options = {
      criteria: query
    }
    return User.load(options)
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

UserSchema.index({ email: 1 }, { unique: true }, { affiliateCode: 1 })

UserSchema.plugin(uniqueValidator)

module.exports = mongoose.model('User', UserSchema)
