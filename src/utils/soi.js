const axios = require('axios')

// Common social insider api object
const jsonObject = {
  jsonrpc: '2.0',
  id: 0
}

// Function to call social insider api
const apiCall = async obj => {
  const result = await axios.post(process.env.SOCIAL_INSIDER_API_URL, obj, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SOCIAL_INSIDER_AUTH_TOKEN}`
    }
  })
  return result
}

// Add profile to social insider
exports.addProfile = async (socialProfile, socialPlatform) => {
  const socialAccountMap = {
    facebook: {
      type: 'facebook_page'
    },
    instagram: {
      type: 'instagram_profile'
    },
    twitter: {
      type: 'twitter_profile'
    },
    youtube: {
      type: 'youtube_channel'
    },
    tiktok: {
      type: 'tiktok_profile'
    }
  }

  let method = 'socialinsider_api.add_profile',
    params = {
      profile_url: `${socialProfile[socialPlatform]}`,
      profile_type: socialAccountMap[socialPlatform].type,
      projectname: process.env.SOCIAL_INSIDER_PROJECT_NAME
    }

  jsonObject.method = method
  jsonObject.params = params

  const result = await apiCall(jsonObject)
  return result.data
}

// Custom error messages
exports.errorMessage = async socialPlatform => {
  const socialAccountMap = {
    facebook: 'Failed to add Facebook profile we support Facebook pages only.',
    instagram:
      'Failed to add Instagram profile we support Instagram business profile only.',
    twitter: 'Failed to add Twitter profile. Please try again.',
    youtube: 'Failed to add Youtube profile. Please try again.',
    tiktok: 'Failed to add Tiktok profile. Please try again.'
  }
  return socialAccountMap[socialPlatform]
}

// Remove trailing slash
exports.stripTrailingSlash = str => {
  if (str.substr(-1) === '/') {
    str.substr(0, str.length - 1)
    let url = str.split('/'),
      arr = url.filter(item => item)
    return arr.pop()
  }
  let url = str.split('/'),
    arr = url.filter(item => item)
  return arr.pop()
}

// Get social insider profile details
exports.getProfileDetails = async (socialInsiderId, profile_type, platform) => {
  let currentTimestamp = Date.now(),
    oneMonthInMilliseconds = 30 * 24 * 60 * 60 * 1000,
    oneMonthAgoTimestamp = currentTimestamp - oneMonthInMilliseconds,
    date = {
      start: oneMonthAgoTimestamp,
      end: currentTimestamp,
      timezone: 'Asia/Kolkata'
    },
    method = 'socialinsider_api.get_profile_data',
    params = {
      id: socialInsiderId,
      profile_type: profile_type,
      date: date
    }

  jsonObject.method = method
  jsonObject.params = params

  const result = await apiCall(jsonObject)

  let profileData = result.data.resp[socialInsiderId]
  let highestFollowersCount = 0
  if (!profileData.err) {
    for (let date in profileData) {
      let currentFollowersCount = profileData[date].followers
        ? profileData[date].followers
        : 0
      if (currentFollowersCount > highestFollowersCount) {
        highestFollowersCount = currentFollowersCount
      }
    }
  }
  let resObj = {
    [platform]: highestFollowersCount
  }
  return resObj
}
