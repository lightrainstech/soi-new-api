'use strict'

module.exports = function (args, done) {
  const { wallet, email, userId, name, affiliateCode } = args.data
  console.log(args.data)
  done()
}
