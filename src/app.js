'use strict'

require('dotenv').config()
// Require external modules
const path = require('path')
const autoload = require('@fastify/autoload')
const swagger = require('@fastify/swagger')

const Etag = require('@fastify/etag')
const cors = require('@fastify/cors')

// Import Swagger Options
const swaggerConf = require('./config/swagger')

module.exports = function (fastify, opts, next) {
  fastify.register(cors, {
    origin: '*',
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
    maxAge: 8400
  })
  fastify.register(swagger, swaggerConf.options)
  fastify.register(Etag)

  fastify.register(autoload, {
    dir: path.join(__dirname, 'plugins')
  })
  fastify.register(autoload, {
    dir: path.join(__dirname, 'services'),
    options: Object.assign({ prefix: '/api' }, opts)
  })

  next()
}
