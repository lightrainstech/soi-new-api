const axios = require('axios')

exports.addProfile = async (socialProfile, socialPlatform) => {
  const socialAccountMap = {
    facebook: {
      url: 'https://www.facebook.com/',
      type: 'facebook_page'
    },
    instagram: {
      url: 'https://www.instagram.com/',
      type: 'instagram_profile'
    },
    twitter: {
      url: 'https://www.twitter.com/',
      type: 'twitter_profile'
    },
    youtube: {
      url: 'https://www.youtube.com/',
      type: 'youtube_channel'
    },
    tiktok: {
      url: 'https://www.tiktok.com/',
      type: 'tiktok_profile'
    }
  }

  const jsonObject = {
    jsonrpc: '2.0',
    id: 0,
    method: 'socialinsider_api.add_profile',
    params: {
      profile_url: `${socialAccountMap[socialPlatform].url}${socialProfile[socialPlatform]}`,
      profile_type: socialAccountMap[socialPlatform].type,
      history_refresh_months: 3,
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

exports.errorMessage = async socialPlatform => {
  const socialAccountMap = {
    facebook: 'Failed to add Facebook profile we support Facebook pages only.',
    instagram:
      'Failed to add Instagram profile we support Instagram business profile only.',
    twitter: 'Failed to add Twitter account. Please try again.',
    youtube: 'Failed to add Youtube account. Please try again.',
    tiktok: 'Failed to add Tiktok account. Please try again.'
  }
  return socialAccountMap[socialPlatform]
}

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
