'use strict'

const fp = require('fastify-plugin')
const Bull = require('bull')

const EventEmitter = require('events')
EventEmitter.defaultMaxListeners = 20

const REDIS_CONN = process.env.REDIS_CONN || '127.0.0.0:6379'

let Redis = require('ioredis')
let client = new Redis(REDIS_CONN)
let subscriber = new Redis(REDIS_CONN)

let opts = {
  createClient: function (type) {
    switch (type) {
      case 'client':
        return client
      case 'subscriber':
        return subscriber
      case 'bclient':
        return new Redis(REDIS_CONN)
      default:
        throw new Error('Unexpected connection type: ', type)
    }
  }
}

// Connect to Bull
async function bullConnect(fastify, options, done) {
  const JOB_QUEUES = process.env.JOB_QUEUES
    ? process.env.JOB_QUEUES.split(',')
    : []
  let jobs = {}
  try {
    if (JOB_QUEUES.length > 0) {
      JOB_QUEUES.forEach(type => {
        jobs[type] = new Bull(type, opts)
      })
      fastify.decorate('bull', jobs)
      console.log(`Bull: ${REDIS_CONN}`)
    } else {
      console.log('No jobs specified')
      fastify.decorate('bull', '')
    }
    done()
  } catch (err) {
    console.log(err)
  }
}
module.exports = fp(bullConnect)
