'use strict'
// External Dependencies
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId

const AffiliateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    agencyCode: {
      type: String,
      default: '--'
    },
    role: {
      type: String
    }
  },
  { timestamps: true }
)

AffiliateSchema.methods = {
  getUserById: async function (id) {
    const Affiliate = mongoose.model('Affiliate')
    let query = { user: ObjectId(id) }
    const options = {
      criteria: query
    }
    return Affiliate.load(options)
  },
  getAgencyAndParentAgency: async function (userId) {
    const Affiliate = mongoose.model('Affiliate')
    const result = await Affiliate.aggregate([
      {
        $match: {
          user: ObjectId(userId)
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'agencyCode',
          foreignField: 'agencyCode',
          as: 'agency'
        }
      },
      {
        $unwind: {
          path: '$agency',
          preserveNullAndEmptyArrays: true
        }
      },
      // {
      //   $lookup: {
      //     from: 'affiliates',
      //     localField: 'agency._id',
      //     foreignField: 'user',
      //     as: 'parentAgency'
      //   }
      // },
      // {
      //   $unwind: {
      //     path: '$parentAgency',
      //     preserveNullAndEmptyArrays: true
      //   }
      // },
    ])
    return result[0]
  }
}

AffiliateSchema.statics = {
  load: function (options, cb) {
    options.select = options.select || 'user agencyCode'
    return this.findOne(options.criteria).select(options.select).exec(cb)
  },

  list: function (options) {
    const criteria = options.criteria || {}
    const page = options.page - 1
    const limit = parseInt(options.limit) || 12
    const select = options.select || 'user agencyCode createdAt -__v'
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
