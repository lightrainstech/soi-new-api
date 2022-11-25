'use strict'

const { mintNFT } = require('../utils/contract')
module.exports = async function (args, done) {
  const { wallet, affiliateCode, redis } = args.data
  try {
    await mintNFT(wallet)
    redis.incrBy(`${affiliateCode}`, -1)
  } catch (error) {
    console.log(error)
  }
  done()
}
