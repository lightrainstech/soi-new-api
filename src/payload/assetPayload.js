const S = require('fluent-json-schema')

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
