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

// Create campaign inside social insider
const createCampaign = async (campaignName, hashTag) => {
  let method = 'socialinsider_api.create_campaigns',
    params = {
      projectname: process.env.SOCIAL_INSIDER_PROJECT_NAME,
      campaign_name: campaignName,
      campaign_type: 'autotag',
      query_string: hashTag
    }

  jsonObject.method = method
  jsonObject.params = params

  const result = await apiCall(jsonObject)
  return result.data
}

// Get all posts based on a campaign
const getPostDetails = async (
  socialInsiderId,
  profile_type,
  startDate,
  endDate,
  campaignName,
  platform
) => {
  let date = {
      start: Date.parse(startDate),
      end: Date.parse(endDate),
      timezone: 'UTC'
    },
    method = 'socialinsider_api.get_posts',
    params = {
      id: socialInsiderId,
      profile_type: profile_type,
      date: date,
      from: 0,
      size: 50,
      projectname: process.env.SOCIAL_INSIDER_PROJECT_NAME,
      campaign_name: campaignName
    }

  jsonObject.method = method
  jsonObject.params = params

  const result = await apiCall(jsonObject)
  let totalLikes = 0
  let totalShares = 0
  let totalComments = 0
  let totalEngagement = 0
  let totalPostEngagementRate = 0
  let totalImpressions = 0
  let totalPosts = 0
  const totalMetrics = (posts, platform) => {
    posts?.forEach(post => {
      totalLikes += post?.activity_by_action_type?.like || post?.likes || 0
      totalShares += post?.shares || 0
      totalComments +=
        post?.activity_by_action_type?.comment || post?.comments || 0
      totalEngagement += post?.engagement || 0
      totalPostEngagementRate += post?.post_engagement_rate || 0
      totalImpressions += post?.impressions_total || post?.impressions || 0
      totalPosts = totalPosts + 1
    })

    return {
      [platform]: {
        totalLikes,
        totalShares,
        totalComments,
        totalEngagement,
        totalPostEngagementRate,
        totalImpressions,
        totalPosts
      }
    }
  }

  if (result.data.error == null && Object.keys(result.data.resp).length !== 0) {
    const { total, returned, size, posts } = result.data.resp
    if (total === returned) {
      const resObject = await totalMetrics(posts, platform)
      return resObject
    } else {
      const apiCallsNeeded = Math.ceil(total / size) - 1
      // Create an array of Promises for each API call
      const promises = Array.from({ length: apiCallsNeeded }, (_, i) => {
        params.from = (i + 1) * size // Set the "from" parameter for each API call
        jsonObject.params = params
        return apiCall(jsonObject)
          .then(res => res.data.resp.posts)
          .catch(err => {
            console.log(err)
            console.error(`Error retrieving posts: ${err}`)
            resObj = {
              [platform]: {
                totalLikes,
                totalShares,
                totalComments,
                totalEngagement,
                totalPostEngagementRate,
                totalImpressions,
                totalPosts
              }
            }
            return resObj
          })
      })

      // Await all the promises and concatenate the posts arrays
      const allPosts = await Promise.all(promises).then(results =>
        posts.concat(...results)
      )
      //console.log(allPosts, allPosts.length)
      const resObject = totalMetrics(allPosts, platform)
      return resObject
    }
  }
  resObj = {
    [platform]: {
      totalLikes,
      totalShares,
      totalComments,
      totalEngagement,
      totalPostEngagementRate,
      totalImpressions,
      totalPosts
    }
  }
  return resObj
}

module.exports = {
  getAccountType,
  addProfile,
  errorMessage,
  stripTrailingSlash,
  getProfileDetails,
  removeProfile,
  getProfileNotExistError,
  createCampaign,
  getPostDetails
}
