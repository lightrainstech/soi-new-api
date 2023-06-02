'use strict'

require('dotenv').config()

const Bull = require('bull')
const REDIS_CONN = process.env.REDIS_CONN || '127.0.0.0:6379'

let Redis = require('ioredis')

let connOpts = {
  tls: null,
  lazyConnect: false,
  showFriendlyErrorStack: true,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
}

let client = new Redis(REDIS_CONN, connOpts)
let subscriber = new Redis(REDIS_CONN, connOpts)

let JOBS = {}
JOBS.sendNFT = require('./processors/sendNFT.js')
JOBS.fetchPostDetails = require('./processors/fetchPostDetails.js')
JOBS.distributeBounty = require('./processors/distributeBounty')


let opts = {
  createClient: type => {
    switch (type) {
      case 'client':
        return client
      case 'subscriber':
        return subscriber
      case 'bclient':
        return new Redis(REDIS_CONN, connOpts)
      default:
        throw new Error('Unexpected connection type: ', type)
    }
  }
}

const JOB_QUEUES = process.env.JOB_QUEUES
  ? process.env.JOB_QUEUES.split(',')
  : []

if (JOB_QUEUES.length > 0) {
  JOB_QUEUES.forEach(type => {
    let jType = new Bull(type, opts)
    jType.process(async (job, done) => {
      return JOBS[type](job, done)
    })
  })
  console.log(`Redis: ${REDIS_CONN}`)
} else {
  console.log('No jobs specified')
}

process.on('exit', function () {
  Redis.quit()
  console.log('About to exit. Redis.quit')
})
