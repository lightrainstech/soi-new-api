const Package = require('../../package.json')
require('dotenv').config()

exports.options = {
  routePrefix: '/docs',
  exposeRoute: true,
  swagger: {
    info: {
      title: Package.name,
      description: `${Package.description}`,
      version: Package.version
    },
    host:
      process.env.SWAGGER_DOMAIN || `${process.env.HOST}:${process.env.PORT}`,
    basePath: '/api',
    schemes: ['https'],
    consumes: ['application/json'],
    produces: ['application/json'],
    securityDefinitions: {
      Bearer: {
        type: 'apiKey',
        in: 'header',
        scheme: 'bearer',
        name: 'Authorization',
        bearerFormat: 'JWT'
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'token'
      }
    }
  }
}
