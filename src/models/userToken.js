'use strict'
// External Dependencies
const mongoose = require('mongoose')

const UserTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    nftId: { type: String, unique: true, required: true },
    avatar: {
      type: String
    }
  },
  { timestamps: true }
)

UserTokenSchema.methods = {
  getUserById: async function (id) {
    const UserToken = mongoose.model('UserToken')
    let query = { _id: id }
    const options = {
      criteria: query
    }
    return UserToken.load(options)
  }
}

UserTokenSchema.statics = {
  load: function (options, cb) {
    options.select = options.select || 'user avatar nftId'
    return this.findOne(options.criteria).select(options.select).exec(cb)
  },

  list: function (options) {
    const criteria = options.criteria || {}
    const page = options.page - 1
    const limit = parseInt(options.limit) || 12
    const select = options.select || 'user avatar nftId createdAt -__v'
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
