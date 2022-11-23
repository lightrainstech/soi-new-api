'use strict'
// External Dependencies
const mongoose = require('mongoose')

const AffiliateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    affiliateCode: { type: String, default: '--' }
  },
  {
    timestamps: true
  }
)

AffiliateSchema.methods = {
  getUserById: async function (id) {
    const Affiliate = mongoose.model('Affiliate')
    let query = { _id: id }
    const options = {
      criteria: query
    }
    return Affiliate.load(options)
  }
}

AffiliateSchema.statics = {
  load: function (options, cb) {
    options.select = options.select || 'user affiliateCode'
    return this.findOne(options.criteria).select(options.select).exec(cb)
  },

  list: function (options) {
    const criteria = options.criteria || {}
    const page = options.page - 1
    const limit = parseInt(options.limit) || 12
    const select = options.select || 'user affiliateCode createdAt -__v'
    return this.find(criteria)
      .select(select)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(limit * page)
      .lean()
      .exec()
  }
}

AffiliateSchema.index({ affiliateCode: 1 })

module.exports = mongoose.model('Affiliate', AffiliateSchema)
