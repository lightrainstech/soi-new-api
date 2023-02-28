const S = require('fluent-json-schema')

exports.addNewBrandSchema = {
  tags: ['Brand'],
  summary: 'Add new brand.',
  body: S.object()
    .prop('companyName', S.string().minLength(4).maxLength(40).required())
    .prop('companyEmail', S.string().format(S.FORMATS.EMAIL).required())
    .prop('wallet', S.string().pattern('^0x[a-fA-F0-9]{40}$').required())
    .prop('file', S.array().required())
}
