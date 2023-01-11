const pinataSDK = require('@pinata/sdk')
const pinata = new pinataSDK(process.env.PINATA_API, process.env.PINATA_SECRET)

async function unpin(hash) {
  await pinata.testAuthentication()
  return await pinata.unpin(hash)
}

exports.unPinFromPinata = async (user, avatar, bannerImage) => {
  try {
    let result
    if (user.avatar && avatar !== null) {
      let currentAvatarHash = user.avatar.split('/').pop(),
        newAvatarHash = avatar.split('/').pop()
      if (currentAvatarHash !== newAvatarHash) {
        result = await unpin(currentAvatarHash)
      }
    }
    if (user.bannerImage && bannerImage !== null) {
      let currentBannerImageHash = user.bannerImage.split('/').pop(),
        newBannerImageHash = bannerImage.split('/').pop()
      if (currentBannerImageHash !== newBannerImageHash) {
        result = await unpin(currentBannerImageHash)
      }
    }
    return result
  } catch (error) {
    throw error
  }
}
