'use strict'
// External Dependencies
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId

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

UserTokenSchema.methods = {
  getUserTokenById: async function (id) {
    const UserToken = mongoose.model('UserToken')
    let query = { _id: id }
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
