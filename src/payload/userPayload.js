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
  summary: 'Available NNFTs',
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

exports.uploadAssetSchema = {
  tags: ['Asset'],
  summary: 'Upload asset file'
}

exports.mintNftSchema = {
  tags: ['Asset'],
  summary: 'Mint nft',
  body: S.object().prop(
    'assetUrl',
    S.string()
      .pattern('([a-zA-Z]+(.[a-zA-Z]+)+).*ipfs')
      .format(S.FORMATS.URI)
      .required()
  )
}
exports.addSocialProfileSchema = {
  tags: ['User'],
  summary: 'Add social profile',
  body: S.object()
    .prop('socialProfile', S.object())
    .prop('type', S.string().enum(['fb', 'ig', 'yt', 'tw', 'tk']).required())
    .allOf([
      S.ifThen(
        S.object().prop('type', S.const('fb')),
        S.object().prop(
          'socialProfile',
          S.object().prop(
            'facebook',
            S.string()
              .pattern(
                '^(https?://)?(www.facebook.com)/(?!.*(profile|page)).+$'
              )
              .required()
          )
        )
      ),
      S.ifThen(
        S.object().prop('type', S.const('ig')),
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
        S.object().prop('type', S.const('tw')),
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
        S.object().prop('type', S.const('yt')),
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
        S.object().prop('type', S.const('tk')),
        S.object().prop(
          'socialProfile',
          S.object().prop(
            'tiktok',
            S.string().pattern('^(https?://)?(www.tiktok.com)/.+$').required()
          )
        )
      )
    ])
}
