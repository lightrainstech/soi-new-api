const { customAlphabet } = require('nanoid')
const randomHashTag = customAlphabet(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  3
)

module.exports = {randomHashTag}
