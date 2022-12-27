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
  body: S.object().prop(
    'assetUrl',
    S.string()
      .pattern('([a-zA-Z]+(.[a-zA-Z]+)+).*ipfs')
      .format(S.FORMATS.URI)
      .required()
  )
}

exports.getUserTokenSchema = {
  tags: ['Asset'],
  summary: 'List user assets',
  security: [{ Bearer: [] }],
  querystring: S.object().prop(
    'page',
    S.number().default(1)
  )
}
