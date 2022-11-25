'use strict'
// External Dependencies
const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')
const bcrypt = require('bcrypt')
const SALT_ROUNDS = 10
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
    name: { type: String, default: '--' },
    phone: { type: String, default: '--' },
    country: { type: String, default: '--' },
    wallet: { type: String, required: true, unique: true },
    affiliateCode: { type: String, default: null },
    hashed_password: {
      type: String,
      default: ''
    },
    authToken: {
      type: String,
      default: ''
    },
    salt: {
      type: String,
      default: ''
    },
    isRestricted: {
      type: Boolean,
      default: false
    },
    otp: {
      type: Number,
      required: true,
      default: 0
    },
    isVerified: { type: Boolean, default: false },
    isKycDone: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ['user', 'influencer', 'agency'],
      default: 'user'
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

UserSchema.virtual('password')
  .set(function (password) {
    this._password = password
    this.salt = this.makeSalt()
    this.hashed_password = this.encryptPassword(password)
  })
  .get(function () {
    return this._password
  })

UserSchema.methods = {
  makeSalt: function () {
    return bcrypt.genSaltSync(SALT_ROUNDS)
  },

  encryptPassword: function (password) {
    if (!password) return ''
    return bcrypt.hashSync(password, this.salt)
  },
  authenticate: (plainText, hashed_password) => {
    return bcrypt.compareSync(plainText, hashed_password)
  },

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
  resetOtp: async function (otp, phone, country) {
    const User = mongoose.model('User')
    return await User.findOneAndUpdate(
      { phone: phone, country: country },
      {
        $set: {
          otp: otp
        }
      },
      { new: true }
    )
  },
  verifyOtp: async function (otp, phone, country) {
    const User = mongoose.model('User')
    return await User.findOneAndUpdate(
      { phone: phone, country: country, otp: otp, isVerified: false },
      {
        $set: {
          otp: 0,
          isVerified: true
        }
      },
      { new: true }
    )
  },
  getUserBywallet: async function (wallet) {
    const User = mongoose.model('User')
    let query = { wallet }
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

UserSchema.index({ email: 1 }, { unique: true })

UserSchema.plugin(uniqueValidator)

module.exports = mongoose.model('User', UserSchema)
