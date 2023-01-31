const S = require('fluent-json-schema')

exports.addNewAgency = {
  tags: ['Admin'],
  summary: 'Add new agency.',
  body: S.object()
    .prop('name', S.string().minLength(4).maxLength(40).required())
    .prop('email', S.string().format(S.FORMATS.EMAIL).required())
    .prop('wallet', S.string().pattern('^0x[a-fA-F0-9]{40}$').required())
}
