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

// Function to return account type
const getAccountType = socialPlatform => {
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
  return socialAccountMap[socialPlatform].type
}

// Add profile to social insider
const addProfile = async (socialProfile, socialPlatform) => {
  let method = 'socialinsider_api.add_profile',
    params = {
      profile_url: `${socialProfile[socialPlatform]}`,
      profile_type: getAccountType(socialPlatform),
      projectname: process.env.SOCIAL_INSIDER_PROJECT_NAME
    }

  jsonObject.method = method
  jsonObject.params = params

  const result = await apiCall(jsonObject)
  return result.data
}

// Custom error messages
const errorMessage = async socialPlatform => {
  const socialAccountMap = {
    facebook: 'Failed to add Facebook profile we support Facebook pages only.',
    instagram:
      'Failed to add Instagram profile we support Instagram business profile only.'
  }
  return socialAccountMap[socialPlatform]
}

// Remove trailing slash
const stripTrailingSlash = str => {
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
const getProfileDetails = async (socialInsiderId, profile_type, platform) => {
  let currentTimestamp = Date.now(),
    oneMonthInMilliseconds = 30 * 24 * 60 * 60 * 1000,
    oneMonthAgoTimestamp = currentTimestamp - oneMonthInMilliseconds,
    date = {
      start: oneMonthAgoTimestamp,
      end: currentTimestamp,
      timezone: 'UTC'
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
  console.log('res', result.data)
  let highestFollowersCount = 0
  if (result.data.error == null && Object.keys(result.data.resp).length !== 0) {
    let profileData = result.data.resp[socialInsiderId]
    highestFollowersCount = Math.max(
      ...Object.values(profileData).map(d => d.followers || 0)
    )
  }
  let resObj = {
    [platform]: highestFollowersCount
  }
  console.log('resObj', resObj)
  return resObj
}

// Remove profile from social insider
const removeProfile = async (socialInsiderId, socialPlatform) => {
  let method = 'socialinsider_api.delete_profile',
    params = {
      id: socialInsiderId,
      profile_type: getAccountType(socialPlatform),
      projectname: process.env.SOCIAL_INSIDER_PROJECT_NAME
    }

  jsonObject.method = method
  jsonObject.params = params

  const result = await apiCall(jsonObject)
  return result.data
}

// Function to return error when a profile not exists in SI
const getProfileNotExistError = platform => {
  const socialAccountMap = {
    facebook: 'No profile with provided id and platform. fb',
    instagram: 'No profile with provided id and platform. ig',
    twitter: 'No profile with provided id and platform. tw',
    youtube: 'No profile with provided id and platform. yt',
    tiktok: 'No profile with provided id and platform. tk'
  }
  return socialAccountMap[platform]
}

module.exports = {
  getAccountType,
  addProfile,
  errorMessage,
  stripTrailingSlash,
  getProfileDetails,
  removeProfile,
  getProfileNotExistError
}
