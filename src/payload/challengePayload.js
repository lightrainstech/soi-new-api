const S = require('fluent-json-schema')

const challengeBodySchema = S.object()
  .prop('title', S.string().required())
  .prop('description', S.string().required())
  .prop('facebookText', S.string())
  .prop('instagramText', S.string())
  .prop('youtubeText', S.string())
  .prop('tiktokText', S.string())
  .prop('twitterText', S.string())
  .prop('mentions', S.array().default([]))
  .prop('hashtags', S.array().default([]))
  .prop('startDate', S.string().format('date-time'))
  .prop('endDate', S.string().format('date-time'))
  .prop('externalLink', S.string())
  .prop('bountyOffered', S.number().minimum(0))
  .prop('location', S.string())

exports.createChallengeSchema = {
  tags: ['Challenge'],
  summary: 'Create new challenge',
  body: challengeBodySchema
}

exports.getChallengeSchema = {
  tags: ['Challenge'],
  summary: 'Get challenge details.',
  params: S.object().prop(
    'challengeId',
    S.string().pattern('^[a-fA-F0-9]{24}$').required()
  )
}

exports.getUserChallengesSchema = {
  tags: ['Challenge'],
  summary: 'Get challenge created by a user.'
}

exports.updateChallengeSchema = {
  tags: ['Challenge'],
  summary: 'Update challenge details',
  body: challengeBodySchema,
  params: S.object().prop(
    'id',
    S.string().pattern('^[a-fA-F0-9]{24}$').required()
  )
}

exports.createhashTagSchema = {
  tags: ['Challenge'],
  summary: 'Create hashTag',
  body: S.object()
    .prop('nftId', S.string().required())
    .prop('nftHashTag', S.string().required()),
  params: S.object().prop(
    'challengeId',
    S.string().pattern('^[a-fA-F0-9]{24}$').required()
  )
}

exports.getHashTagSchema = {
  tags: ['Challenge'],
  summary: 'Get hashTag',
  params: S.object().prop(
    'challengeId',
    S.string().pattern('^[a-fA-F0-9]{24}$').required()
  ),
  querystring: S.object()
    .prop('nftId', S.string().required())
}

exports.getChallengeParticipantsDetailSchema = {
  tags: ['Challenge'],
  summary: 'Get challenge participation details',
  params: S.object().prop(
    'challengeId',
    S.string().pattern('^[a-fA-F0-9]{24}$').required()
  ),
}
