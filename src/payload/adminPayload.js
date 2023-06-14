const S = require('fluent-json-schema')

exports.nftAlloctionSchema = {
  tags: ['Admin'],
  summary: 'Allocate number of NFTs for affliatecode',
  body: S.object()
    .prop('agencyCode', S.string().maxLength(8))
    .prop('nftAllocation', S.number().minimum(0).default(0))
}
