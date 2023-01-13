const pinataSDK = require('@pinata/sdk')
const pinata = new pinataSDK(process.env.PINATA_API, process.env.PINATA_SECRET)

exports.unpin = async (hash) => {
  await pinata.testAuthentication()
  return await pinata.unpin(hash)
}
