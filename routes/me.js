'use strict';

const { User, sequelize } = require('../../../db');

const CrudRoute = require('../../libs/crud-route');
const userSchema = require('../../../db/schemas/user');

const crudRoute = new CrudRoute({
  resource: 'me',
  freezeResource: true,
  Model: User,
  schema: userSchema,
  authenticated: true
});

crudRoute.addRoute({
  path: '/',
  method: 'get',
  validate: {
    output: { type: 'object' }
  },
  handler: async function(ctx) {
    const knowledgeBases = await ctx.req.user.getKnowledgeBases();
    ctx.body = {
      user: { ...ctx.req.user.toJSON(), knowledgeBases }
    };
    ctx.status = 200;
  }
});

crudRoute.addRoute({
  path: '/password',
  method: 'put',
  validate: {
    body: {
      type: 'object',
      properties: {
        password: { type: 'string' }
      },
      required: ['password']
    },
    output: { type: 'object' }
  },
  handler: async function(ctx) {
    const { password } = ctx.request.body;

    const user = await sequelize.transaction(async transaction => {
      ctx.req.user.passwordChanged = new Date();
      ctx.req.user.password = password;

      const updated = await ctx.req.user.save({ transaction });
      return updated.toJSON();
    });

    ctx.body = { user };
    ctx.status = 200;
  }
});

module.exports = crudRoute.router;
