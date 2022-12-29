const axios = require('axios')

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

  const jsonObject = {
    jsonrpc: '2.0',
    id: 0,
    method: 'socialinsider_api.add_profile',
    params: {
      profile_url: `${socialProfile[socialPlatform]}`,
      profile_type: socialAccountMap[socialPlatform].type,
      projectname: process.env.SOCIAL_INSIDER_PROJECT_NAME
    }
  }
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.SOCIAL_INSIDER_AUTH_TOKEN}`
  }
  const result = await axios.post(
    process.env.SOCIAL_INSIDER_API_URL,
    jsonObject,
    {
      headers: headers
    }
  )
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
