const Redis = require('ioredis');
const passport = require('passport');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const {
  setupOpenId,
  googleLogin,
  githubLogin,
  discordLogin,
  facebookLogin,
} = require('~/strategies');
const { logger } = require('~/config');

/**
 *
 * @param {Express.Application} app
 */
const configureSocialLogins = (app) => {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(googleLogin());
  }
  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    passport.use(facebookLogin());
  }
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(githubLogin());
  }
  if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
    passport.use(discordLogin());
  }
  if (
    process.env.OPENID_CLIENT_ID &&
    process.env.OPENID_CLIENT_SECRET &&
    process.env.OPENID_ISSUER &&
    process.env.OPENID_SCOPE &&
    process.env.OPENID_SESSION_SECRET
  ) {
    const sessionOptions = {
      secret: process.env.OPENID_SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
    };
    if (process.env.USE_REDIS) {
      const client = new Redis(process.env.REDIS_URI);
      client
        .on('error', (err) => logger.error('ioredis error:', err))
        .on('ready', () => logger.info('ioredis successfully initialized.'))
        .on('reconnecting', () => logger.info('ioredis reconnecting...'));
      sessionOptions.store = new RedisStore({ client, prefix: 'librechat' });
    }
    app.use(session(sessionOptions));
    app.use(passport.session());
    setupOpenId();
  }
};

module.exports = configureSocialLogins;
