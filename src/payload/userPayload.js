const S = require('fluent-json-schema')

exports.otpSchema = {
  tags: ['User'],
  summary: 'User sign up',
  body: S.object()
    .prop('name', S.string().minLength(4).maxLength(40).required())
    .prop('email', S.string().format(S.FORMATS.EMAIL).required())
    .prop('phone', S.string())
    .prop('wallet', S.string().pattern('^0x[a-fA-F0-9]{40}$').required())
    .prop('affCode', S.string().maxLength(8))
    .prop('country', S.string().required())
}

exports.loginSchema = {
  tags: ['User'],
  summary: 'User login',
  body: S.object()
    .prop('email', S.string().required())
    .prop('password', S.string().required())
}

exports.otpResendSchema = {
  tags: ['User'],
  summary: 'Get OTP',
  body: S.object()
    .prop('phone', S.string().required())
    .prop('country', S.string().required())
}

exports.otpVerifySchema = {
  tags: ['User'],
  summary: 'Verify OTP',
  body: S.object()
    .prop('phone', S.string().required())
    .prop('country', S.string().required())
    .prop('otp', S.string().required())
  // TODO change this when move to production
  // .prop('otp', S.string().minLength(4).maxLength(4).required())
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
}

exports.getMeSchema = {
  tags: ['User'],
  summary: 'Get user profile',
  security: [{ Bearer: [] }]
}
