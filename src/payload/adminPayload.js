const S = require('fluent-json-schema')

exports.nftAlloctionSchema = {
  tags: ['Admin'],
  summary: 'Allocate NNFTs for affliatecode',
  body: S.object()
    .prop('affCode', S.string().maxLength(8))
    .prop('nftAllocation', S.number().minimum(0).default(0))
}
