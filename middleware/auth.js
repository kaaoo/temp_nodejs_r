const passport = require('koa-passport'); 
const LocalStrategy = require('passport-local');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { AUTH_SECRET_KEY: jwtSecret } = require('../config');
const jwt = require('jsonwebtoken');

const { User } = require('../../../db');
const { USER_ROLES } = require('../../constants');

//----------Passport Local Strategy--------------//

passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
    session: false
  },
  function (email, password, done) {
    User.findOne({ where: { email, password } })
      .then((user) => {
        if (!user /*|| !user.checkPassword(password)*/) {
          return done(null, false, { message: 'User does not exist or wrong password.' });
        }
        return done(null, user);
      });
  }
));

//----------Passport JWT Strategy--------//

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromHeader('authorization'),
  secretOrKey: jwtSecret
};

passport.use(new JwtStrategy(jwtOptions,
  function (payload, done) {
    User.findById(payload.id)
      .then(user => {
        if (user) {
          done(null, user);
        } else {
          done(null, false);
        }
      });
  })
);

const jwtAuth = async(ctx, next) => {
  await passport.authenticate('jwt', function(err, user) {
    if (user) {
      ctx.user = user;
    } else {
      ctx.status = 401;
      ctx.body = { message: 'No such user' };
      console.log('err', err);
    }
  })(ctx, next);
};

const localAuth = async(ctx, next) => {
  await passport.authenticate('local', function (err, user) {
    if (!user) {
      ctx.status = 401;
      ctx.body = { message: 'Login failed' };
    } else {
 
      const payload = {
        id: user.id,
        username: user.username
      };
      const token = jwt.sign(payload, jwtSecret);  

      ctx.body = { user: user.id, token: 'JWT ' + token };
    }
  })(ctx, next);
};

async function auth(ctx, next) {
  try {
    await passport.authenticate('jwt', { session: false })(ctx, () => {});
  } catch (e) {
    ctx.status = 500;
    ctx.body = { message: e.message };
    return;
  }

  if (!ctx.isAuthenticated()) {
    ctx.status = 403;
    ctx.body = { message: 'Authorization is required' };
    return;
  }

  if (ctx.req.user.role === USER_ROLES.BLOCKED) {
    ctx.status = 403;
    ctx.body = { message: 'User is blocked' };
    return;
  }

  return next();
}

function onlyAdmin(ctx, next) {
  if (ctx.req.user.role !== USER_ROLES.ADMIN) {
    ctx.status = 403;
    ctx.body = { message: 'Access is denied' };
    return;
  }

  return next();
}

module.exports = {
  localAuth,
  jwtAuth,
  auth,
  onlyAdmin
};