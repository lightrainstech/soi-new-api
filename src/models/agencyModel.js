'use strict'

const mongoose = require('mongoose')
const Schema = mongoose.Schema
const { customAlphabet } = require('nanoid')
const nanoidLong = customAlphabet(
  '5eDVbMmnXU9GRaF3H4Cl2vwSzYsqfrLdyOIKWZ78hkJPgTN6xEjcQtABpu',
  8
)

const agencySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
  parentAgencyId: {
    type: Schema.ObjectId
  },
  wallet: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['agency', 'sub-agency'],
    default: 'agency'
  },
  agencyCode: { type: String, default: null }
})

agencySchema.pre('save', async function (next) {
  this.agencyCode = nanoidLong()
  next()
})

agencySchema.methods = {
  getAgencyByWallet: async function(wallet) {
    const Agency = mongoose.model('Agency')
    let query = { wallet: wallet }
    const options = {
      criteria: query,
    }
    return Agency.load(options)
  }
}

agencySchema.statics = {
  load: function (options, cb) {
    options.select = options.select || 'email name wallet role agencyCode'
    return this.findOne(options.criteria).select(options.select).exec(cb)
  }
}

module.exports = mongoose.model('Agency', agencySchema)
