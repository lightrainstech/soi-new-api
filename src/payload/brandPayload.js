const S = require('fluent-json-schema')

exports.addNewBrandSchema = {
  tags: ['Brand'],
  summary: 'Add new brand.',
  body: S.object()
    .prop('name', S.string().minLength(4).maxLength(40).required())
    .prop('email', S.string().format(S.FORMATS.EMAIL).required())
    .prop('wallet', S.string().pattern('^0x[a-fA-F0-9]{40}$').required())
    .prop('file', S.array().required()),
  querystring: S.object().prop(
    'agencyCode',
    S.string().minLength(8).maxLength(8).required()
  )
}

exports.getBrandDetailSchema = {
  tags: ['Brand'],
  summary: 'Get brand details.'
}

exports.checkAgencyCodeForBrandSchema = {
  tags: ['Brand'],
  summary: 'Check agency code.',
  querystring: S.object().prop(
    'agencyCode',
    S.string().minLength(8).maxLength(8).required()
  )
}

exports.walletConnectSchema = {
  tags: ['Brand'],
  summary: 'Wallet connect and signature verification',
  body: S.object()
    .prop('wallet', S.string().pattern('^0x[a-fA-F0-9]{40}$').required())
    .prop('signature', S.string().required())
    .prop('message', S.string().required())
}
