'use strict';

const jwt = require('jsonwebtoken');
const { User, sequelize } = require('../../../db');
const { AUTH_SECRET_KEY } = require('../config');
const { USER_ROLES } = require('../../constants');

const router = require('koa-router')();
router.prefix('/api/login');

router.post('/', async function(ctx) {
  const { email, password } = ctx.request.body;

  if (!email) {
    ctx.body = '"email" must be specified';
    ctx.status = 400;
    return;
  }

  if (!password) {
    ctx.body = '"password" must be specified';
    ctx.status = 400;
    return;
  }

  const { user, token } = await sequelize.transaction(async transaction => {
    const user = await User.findOne({ where: { email } }, { transaction });
    if (!user) {
      return {};
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return {};
    }

    await user.update({ lastAuthTime: new Date() }, { transaction });

    const token = jwt.sign({ id: user.id }, AUTH_SECRET_KEY);
    const userData = user.toJSON();

    return { token, user: userData };
  });

  if (!user) {
    ctx.body = '';
    ctx.status = 401;
    return;
  }

  if (user.role === USER_ROLES.BLOCKED) {
    ctx.body = '';
    ctx.status = 403;
    return;
  }

  ctx.status = 200;
  ctx.body = JSON.stringify({ token, user });
});

module.exports = router;