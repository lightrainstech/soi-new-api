'use strict'

//const { mintNFT } = require('../utils/contract')
module.exports = function (args, done) {
  const { wallet,affiliateCode,redis } = args.data
  console.log(args.data)
  try {
    await mintNFT(wallet)
    redis.incrBy(`${affiliateCode}`, -1)

  } catch (error) {
      throw error
  }
  done()
}
