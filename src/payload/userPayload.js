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
    .prop('agencyCode', S.string().maxLength(8))
    .prop('country', S.string().required())
}

exports.nftAvailableSchema = {
  tags: ['User'],
  summary: 'Get available number of NFTs',
  params: S.object().prop('agencyCode', S.string().maxLength(8))
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

exports.checkUsernameSchema = {
  tags: ['User'],
  summary: 'Check username exists or not.',
  querystring: S.object().prop(
    'userName',
    S.string().minLength(4).maxLength(40).required()
  )
}

exports.updateAvatarOrBanner = {
  tags: ['User'],
  summary: 'Update avatar',
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
    .prop('fileType', S.string().required())
    .prop('fileName', S.string().required()),
  querystring: S.object().prop('isBanner', S.boolean().default(false))
}

exports.checkWalletSchema = {
  tags: ['User'],
  summary: 'Check wallet exists or not.',
  querystring: S.object().prop('wallet', S.string().pattern('^0x[a-fA-F0-9]{40}$').required())
}
