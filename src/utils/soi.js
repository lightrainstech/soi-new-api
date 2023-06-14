const axios = require('axios')

// Common social insider api object
let jsonObject = {
  jsonrpc: '2.0',
  id: 0
}

// Function to call social insider api
const apiCall = async obj => {
  try {
    console.log('Inside apiCall', obj)
    const result = await axios.post(process.env.SOCIAL_INSIDER_API_URL, obj, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SOCIAL_INSIDER_AUTH_TOKEN}`
      }
    })
    return result
  } catch (error) {
    console.error('API call failed with error: ', error.message)
    throw error
  }
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

// Constants for retry
const MAX_RETRIES = 5
const RETRY_DELAY = 1000

// Add profile to social insider
const addProfile = async (socialProfile, socialPlatform) => {
  if (!socialProfile || !socialPlatform) {
    console.log('Invalid or missing parameters exiting.')
    return 0
  }
  let retries = 0
  while (retries < MAX_RETRIES) {
    try {
      let method = 'socialinsider_api.add_profile',
        params = {
          profile_url: `${socialProfile[socialPlatform]}`,
          profile_type: getAccountType(socialPlatform),
          projectname: process.env.SOCIAL_INSIDER_PROJECT_NAME
        }

      jsonObject.method = method
      jsonObject.params = params

      const result = await apiCall(jsonObject)

      console.log('After add profile call', result?.data || 'no api response')

      if (result && result?.data) {
        return result?.data
      } else {
        return 0
      }
    } catch (error) {
      console.error('Adding profile failed with error: ', error.message)
      retries++
      if (retries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      }
    }
  }
  throw new Error('Failed to add profile after max retries.')
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
  let resObj = {}

  if (!socialInsiderId || !profile_type || !platform) {
    console.log('Invalid or missing parameters exiting.')
    resObj = { [platform]: 0 }
    return resObj
  }

  let retries = 0
  while (retries < MAX_RETRIES) {
    try {
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

      console.log('Before SI api call', jsonObject)

      const result = await apiCall(jsonObject)

      console.log('API call result object', result?.data)

      // if result is error
      if (result?.data?.error) {
        console.log(
          `Error in fetching profile details: ${result?.data?.error?.message}`
        )
        resObj = { [platform]: 0 }
        return resObj
      }

      console.log('After SI call')

      let profileData = {},
        highestFollowersCount = 0

      if (result?.data?.resp && Object.keys(result?.data?.resp).length > 0) {
        console.log('Inside if condition')

        profileData = result?.data?.resp[socialInsiderId]

        console.log('profileData', profileData)

        highestFollowersCount = Math.max(
          ...Object.values(profileData).map(d => d?.followers || 0)
        )

        console.log('highestFollowersCount', highestFollowersCount)

        resObj = { [platform]: highestFollowersCount ?? 0 }

        console.log('resObj', resObj)

        return resObj
      } else {
        resObj = { [platform]: 0 }
        return resObj
      }
    } catch (error) {
      console.error('Error in fetching profile details:', error.message)
      retries++
      if (retries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      }
    }
  }
  throw new Error('Failed to fetch profile details after max retries.')
}

// Remove profile from social insider
const removeProfile = async (socialInsiderId, socialPlatform) => {
  let retries = 0
  while (retries < MAX_RETRIES) {
    try {
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
    } catch (error) {
      console.error('Error in removing profile details:', error.message)
      retries++
      if (retries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      }
    }
  }
  throw new Error('Failed to remove profile details after max retries.')
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
  let retries = 0
  while (retries < MAX_RETRIES) {
    try {
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
    } catch (error) {
      console.error('Error in creating campaigns:', error.message)
      retries++
      if (retries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      }
    }
  }
  throw new Error('Failed to create campaigns after max retries.')
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
    method = 'socialinsider_api.get_posts'
  const params = {
    id: socialInsiderId,
    profile_type,
    date,
    from: 0,
    size: 50,
    projectname: process.env.SOCIAL_INSIDER_PROJECT_NAME,
    campaign_name: campaignName
  }

  jsonObject.method = method
  jsonObject.params = params

  let retries = 0
  while (retries < MAX_RETRIES) {
    try {
      const result = await apiCall(jsonObject)
      let totalLikes = 0
      let totalShares = 0
      let totalComments = 0
      let totalEngagement = 0
      let totalPostEngagementRate = 0
      let totalImpressions = 0
      let totalPosts = 0
      let totalVideoViews = 0
      const totalMetrics = (posts, platform) => {
        posts?.forEach(post => {
          // Total likes
          totalLikes += post?.activity_by_action_type?.like || post?.likes || 0

          // Total shares
          totalShares += post?.shares || 0

          // Total comments
          totalComments +=
            post?.activity_by_action_type?.comment || post?.comments || 0

          // Total engagement
          totalEngagement += post?.engagement || 0

          // Total post engagement rate
          totalPostEngagementRate += post?.post_engagement_rate || 0

          // Total impressions
          if (platform === 'tiktok' || platform === 'youtube') {
            totalImpressions += post?.video_views || 0
          } else {
            totalImpressions +=
              parseInt(post?.impressions) ||
              parseInt(post?.impressions_total) ||
              0
          }

          // Total posts
          totalPosts++

          // Total video views
          totalVideoViews += post?.video_views || 0
        })

        return {
          [platform]: {
            totalLikes,
            totalShares,
            totalComments,
            totalEngagement,
            totalPostEngagementRate,
            totalImpressions,
            totalPosts,
            totalVideoViews
          }
        }
      }

      if (
        result.data.error == null &&
        Object.keys(result.data.resp).length !== 0
      ) {
        const { returned, size, posts } = result.data.resp
        const total = result.data.resp.total || result.data.resp.total.value
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
                console.error(`Error retrieving posts: ${err.message}`)
                resObj = {
                  [platform]: {
                    totalLikes,
                    totalShares,
                    totalComments,
                    totalEngagement,
                    totalPostEngagementRate,
                    totalImpressions,
                    totalPosts,
                    totalVideoViews
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
          totalPosts,
          totalVideoViews
        }
      }
      return resObj
    } catch (error) {
       console.error('Error in fetching post details:', error.message)
      retries++
      if (retries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      }
      return {
        [platform]: {
          totalLikes: 0,
          totalShares: 0,
          totalComments: 0,
          totalEngagement: 0,
          totalPostEngagementRate: 0,
          totalImpressions: 0,
          totalPosts: 0,
          totalVideoViews: 0
        }
      }
    }
  }
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
