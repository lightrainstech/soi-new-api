'use strict'
const mongoose = require('mongoose')

const ChallengeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User', required: true
  },
  title: {
    type: String
  },
  description: {
    type: String
  },
  facebookText: {
    type: String
  },
  instagramText: {
    type: String
  },
  twitterText: {
    type: String
  },
  youtubeText: {
    type: String
  },
  tiktokText: {
    type: String
  },
  hashtags: {
    type: [String]
  },
  mentions: {
    type: [String]
  },
  startDateAndTime: {
    type: String
  },
  endDateAndTime: {
    type: String
  },
  externalLink: {
    type: String
  },
  location: {
    type: String
  },
  faceBookPosts: {
    type: Number
  },
  instagramPosts: {
    type: Number
  },
  twitterPosts: {
    type: Number
  },
  youtubePosts: {
    type: Number
  },
  tiktokPosts: {
    type: Number
  },
  likes: {
    type: Number
  },
  shares: {
    type: Number
  },
  youtubeViews: {
    type: Number
  },
  bountyRequired: {
    type: Number
  },
  bountyOffered: {
    type: Number
  }
})

module.exports = mongoose.model('Challenge', ChallengeSchema)
