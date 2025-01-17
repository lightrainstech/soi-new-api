'use strict'

const mongoose = require('mongoose')
const { mintNFT } = require('../utils/contract')
const { checkSumAddress } = require('../utils/contract')
const { randomHashTag } = require('../utils/hashtag')

const UserToken = require('../models/userToken.js')
module.exports = async function (args, done) {
  const { wallet, userId, metaDataUrl, assetUrl, thumbnail, name } = args.data
  console.log('--------Inside processor---------')
  try {
    const db = await mongoose.connect(process.env.MONGO_CONN, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    let mintResult = await mintNFT(wallet, metaDataUrl),
      tokenId = parseInt(mintResult.tokenId),
      userTokenModel = new UserToken(),
      checkSumWallet = await checkSumAddress(wallet)

    // Create unique hashtag for nft
    let tokenHashTag
    do {
      tokenHashTag = randomHashTag()
    } while (await UserToken.findOne({ tokenHashTag: tokenHashTag }))

    userTokenModel.user = userId
    userTokenModel.nftId = tokenId
    userTokenModel.avatar = assetUrl
    userTokenModel.thumbnail = thumbnail
    userTokenModel.name = name
    userTokenModel.owner = checkSumWallet
    userTokenModel.creator = checkSumWallet
    userTokenModel.tokenHashTag = tokenHashTag

    await userTokenModel.save()
    console.log('saved')
    console.log('---------done-------')
    done()
  } catch (error) {
    console.log(error)
  }
}
