'use strict'

const mongoose = require('mongoose')
const { mintNFT } = require('../utils/contract')

const UserToken = require('../models/userToken.js')
module.exports = async function (args, done) {
  const { wallet, userId, metaDataUrl, assetUrl, thumbnail } = args.data
  console.log('--------Inside processor---------')
  try {
    console.log(wallet, userId)
    const db = await mongoose.connect(process.env.MONGO_CONN, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    let mintResult = await mintNFT(wallet, metaDataUrl),
      tokenId = parseInt(mintResult.tokenId),
      userTokenModel = new UserToken()
      
    userTokenModel.user = userId
    userTokenModel.nftId = tokenId
    userTokenModel.avatar = assetUrl
    userTokenModel.thumbnail = thumbnail

    await userTokenModel.save()
    console.log('saved')
    console.log('---------done-------')
    done()
  } catch (error) {
    console.log(error)
  }
}
