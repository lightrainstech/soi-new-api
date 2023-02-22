'use strict'

const randomHashTag = () => {
  const characters =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const strings = new Set()

  while (strings.size < characters.length ** 3) {
    let string = ''
    for (let i = 0; i < 3; i++) {
      string += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    if (!strings.has(string)) {
      strings.add(string)
    }
  }

  const randomIndex = Math.floor(Math.random() * strings.size)
  return Array.from(strings)[randomIndex]
}

module.exports = { randomHashTag }
