'use strict'

const mongoose = require('mongoose')
const { mintNFT } = require('../utils/contract')

const UserToken = require('../models/userToken.js')
module.exports = async function (args, done) {
  const { wallet, affiliateCode, userId } = args.data
  console.log('--------Inside processor---------')
  try {
    const db = await mongoose.connect(process.env.MONGO_CONN, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    let mintResult = await mintNFT(wallet),
      tokenId = parseInt(mintResult.tokenId),
      userTokenModel = new UserToken()
    userTokenModel.user = userId
    userTokenModel.nftId = tokenId
    await userTokenModel.save()
    console.log('saved')
    console.log('---------done-------')
  } catch (error) {
    console.log(error)
  }
  done()
}
