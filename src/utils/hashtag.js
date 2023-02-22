'use strict'
const fs = require('fs')


// Create random hashtag for challenges and NFTs
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

// Get team name
const getTeamName = async index => {
  const filePath = './data/teamNames.txt'
  try {
    const namesData = await fs.promises.readFile(filePath, { encoding: 'utf-8' })
    const names = namesData.split('\n')
    return names[index-1]
  } catch (err) {
    throw err
  }
}

module.exports = { randomHashTag, getTeamName }
