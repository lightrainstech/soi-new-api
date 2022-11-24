const fp = require('fastify-plugin')
const Redis = require('ioredis')

// Connect to Redis
async function redisConnect(fastify, options, done) {
  try {
    const REDIS_CONN = process.env.REDIS_CONN
    if (REDIS_CONN) {
      const redis = new Redis(REDIS_CONN)
      fastify.decorate('redis', redis)
      console.log(`Redis: ${REDIS_CONN}`)
    } else {
      console.log('Error connecting redis')
      fastify.decorate('redis', '')
    }
    fastify.addHook('onClose', close)
    done()
  } catch (err) {
    console.log(err)
  }
}

function close(fastify, done) {
  fastify.redis.quit(done)
}

module.exports = fp(redisConnect)
