const S = require('fluent-json-schema')

exports.signUpSchema = {
  tags: ['User'],
  summary: 'User sign up',
  body: S.object()
    .prop('name', S.string().minLength(4).maxLength(40).required())
    .prop('userName', S.string().minLength(4).maxLength(40).required())
    .prop('email', S.string().format(S.FORMATS.EMAIL).required())
    .prop('phone', S.string())
    .prop('wallet', S.string().pattern('^0x[a-fA-F0-9]{40}$').required())
    .prop('affCode', S.string().maxLength(8))
    .prop('country', S.string().required())
}

exports.nftAvailableSchema = {
  tags: ['User'],
  summary: 'Get available number of NFTs',
  params: S.object().prop('affCode', S.string().maxLength(8))
}

exports.walletConnectSchema = {
  tags: ['User'],
  summary: 'Wallet connect and signature verification',
  body: S.object()
    .prop('wallet', S.string().pattern('^0x[a-fA-F0-9]{40}$').required())
    .prop('signature', S.string().required())
    .prop('message', S.string().required())
}

exports.getMeSchema = {
  tags: ['User'],
  summary: 'Get user profile',
  security: [{ Bearer: [] }]
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
            .pattern('^(https?://)?(www.facebook.com)/(?!.*(profile|page)).+$')
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
  tags: ['User'],
  summary: 'Add social profile',
  body: socialProfileSchema
}

exports.removeSocialProfileSchema = {
  tags: ['User'],
  summary: 'Remove social profile',
  body: socialProfileSchema
}

exports.checkUsernameSchema = {
  tags: ['User'],
  summary: 'Check username exists or not.',
  querystring: S.object().prop(
    'userName',
    S.string().minLength(4).maxLength(40).required()
  )
}

exports.updateAvatar = {
  tags: ['User'],
  summary: 'Update avatar',
  body: S.object().prop(
    'avatar',
    S.string()
      .pattern('([a-zA-Z]+(.[a-zA-Z]+)+).*ipfs')
      .format(S.FORMATS.URI)
      .required()
  ),
  querystring: S.object().prop(
    'isBanner',
    S.boolean().default(false)
  )
}

exports.checkIsMintedStatusSchema = {
  tags: ['User'],
  summary: 'Check user has already minted the nft or not.'
}

exports.checkEmailSchema = {
  tags: ['User'],
  summary: 'Check email exists or not.',
  params: S.object().prop(
    'email',
    S.string().format(S.FORMATS.EMAIL).required()
  )
}

exports.checkFollowersCountSchema = {
  tags: ['User'],
  summary: 'Get social profile followers count.'
}

exports.updateProfileSchema = {
  tags: ['User'],
  summary: 'Update user profile',
  body: S.object()
    .prop('name', S.string().minLength(4).maxLength(40))
    .prop('phone', S.string())
    .prop('country', S.string().required())
}

exports.s3SignatureVerificationSchema = {
  tags: ['User'],
  summary: 'S3 signature verification.',
  description: 'S3 signature verification.',
  body: S.object()
    .prop('fileType', S.string().required()),
  querystring: S.object().prop(
    'isBanner',
    S.boolean().default(false)
  )
}
