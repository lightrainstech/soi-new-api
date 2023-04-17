const S = require('fluent-json-schema')

exports.uploadAssetSchema = {
  tags: ['Asset'],
  summary: 'Upload asset file',
  security: [{ Bearer: [] }]
}

exports.mintNftSchema = {
  tags: ['Asset'],
  summary: 'Mint nft',
  security: [{ Bearer: [] }],
  body: S.object()
    .prop(
      'assetUrl',
      S.string()
        .pattern('([a-zA-Z]+(.[a-zA-Z]+)+).*ipfs')
        .format(S.FORMATS.URI)
        .required()
    )
    .prop('thumbnail', S.string().format(S.FORMATS.URI).required())
    .prop('name', S.string().required())
}

exports.getUserTokenSchema = {
  tags: ['Asset'],
  summary: 'List user assets',
  security: [{ Bearer: [] }],
  querystring: S.object().prop('page', S.number().default(1))
}

exports.checkJobStatusSchema = {
  tags: ['Asset'],
  summary: 'Check minting completed or not.',
  params: S.object().prop('jobId', S.number().minimum(1).required())
}

const socialProfileSchema = S.object()
  .prop('socialProfile', S.object())
  .prop(
    'type',
    S.string()
      .enum(['facebook', 'instagram', 'youtube', 'twitter', 'tiktok'])
      .required()
  )
  .allOf([
    S.ifThen(
      S.object().prop('type', S.const('facebook')),
      S.object().prop(
        'socialProfile',
        S.object().prop(
          'facebook',
          S.string()
            .pattern('^(https?://)?(www.)?facebook.com/[a-zA-Z0-9.]{5,}(/)?$')
            .required()
        )
      )
    ),
    S.ifThen(
      S.object().prop('type', S.const('instagram')),
      S.object().prop(
        'socialProfile',
        S.object().prop(
          'instagram',
          S.string()
            .pattern(
              '(?:(?:http|https)://)?(?:www.)?(?:instagram.com|instagr.am)/([A-Za-z0-9-_.]+)'
            )
            .required()
        )
      )
    ),
    S.ifThen(
      S.object().prop('type', S.const('twitter')),
      S.object().prop(
        'socialProfile',
        S.object().prop(
          'twitter',
          S.string()
            .pattern('http(?:s)?://(?:www.)?twitter.com/([a-zA-Z0-9_]+)')
            .required()
        )
      )
    ),

    S.ifThen(
      S.object().prop('type', S.const('youtube')),
      S.object().prop(
        'socialProfile',
        S.object().prop(
          'youtube',
          S.string()
            .pattern('^(https?://)?(www.youtube.com|youtu.be)/.+$')
            .required()
        )
      )
    ),
    S.ifThen(
      S.object().prop('type', S.const('tiktok')),
      S.object().prop(
        'socialProfile',
        S.object().prop(
          'tiktok',
          S.string().pattern('^(https?://)?(www.tiktok.com)/.+$').required()
        )
      )
    )
  ])

exports.addSocialProfileSchema = {
  tags: ['Asset'],
  summary: 'Add social profile',
  body: socialProfileSchema,
  params: S.object().prop('nftId', S.string().required())
}

exports.removeSocialProfileSchema = {
  tags: ['Asset'],
  summary: 'Remove social profile',
  body: socialProfileSchema,
  params: S.object().prop('nftId', S.string().required())
}

exports.checkFollowersCountSchema = {
  tags: ['Asset'],
  summary: 'Get social profile followers count.'
}

exports.markAsActiveSchema = {
  tags: ['Asset'],
  summary: 'Select an NFT',
  params: S.object().prop(
    'nftId',
    S.string().required()
  )
}

exports.getRecentlyMintedNftSchema = {
  tags: ['Asset'],
  summary: 'Get recently minted nft of a user.'
}

exports.nftDetailsSchema = {
  tags: ['Asset'],
  summary: 'Get nft details',
  params: S.object().prop('nftId', S.string().required())
}
