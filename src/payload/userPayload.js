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
  summary: 'Upload asset file',
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
