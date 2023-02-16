const S = require('fluent-json-schema')

exports.createChallengeSchema = {
  tags: ['Challenge'],
  summary: 'Create new challenge',
  body: S.object()
    .prop('title', S.string())
    .prop('description', S.string())
    .prop('facebookText', S.string())
    .prop('instagramText', S.string())
    .prop('youtubeText', S.string())
    .prop('tiktokText', S.string())
    .prop('mentions', S.array())
    .prop('hashtags', S.array())
    .prop('startDate', S.string().format('date-time'))
    .prop('endDate', S.string().format('date-time'))
    .prop('externalLink', S.string())
    .prop('faceBookPosts', S.number().minimum(0))
    .prop('instagramPosts', S.number().minimum(0))
    .prop('twitterPosts', S.number().minimum(0))
    .prop('youtubePosts', S.number().minimum(0))
    .prop('tiktokPosts', S.number().minimum(0))
    .prop('likes', S.number().minimum(0))
    .prop('shares', S.number().minimum(0))
    .prop('youtubeViews', S.number().minimum(0))
    .prop('bountyRequired', S.number().minimum(0))
    .prop('bountyOffered', S.number().minimum(0))
}
