'use strict';

const { User, sequelize } = require('../../../db');
const { DUPLICATION_ERROR } = require('../../constants');
const { onlyAdmin } = require('../middleware/auth');

const CrudRoute = require('../../libs/crud-route');
const userSchema = require('../../../db/schemas/user');

const crudRoute = new CrudRoute({
  resource: 'user',
  Model: User,
  schema: userSchema,
  authenticated: true,
  middlewares: [onlyAdmin]
});

crudRoute.addFilterRouter({
  identifier: {
    type: 'string'
  },
  email: {
    type: 'string'
  }
});
crudRoute.addGetListRouter();
crudRoute.addGetRouter();
crudRoute.addDeleteRouter();
crudRoute.addPostRouter({ preCreate: validate });
crudRoute.addPutRouter({ preUpdate: validate });

async function validate(ctx, { current, newData, transaction }) {
  const where = {};
  const whereOr = [{ identifier: newData.identifier }, { email: newData.email }];

  if (current) {
    where[sequelize.Op.and] = [
      { id: { [sequelize.Op.ne]: current.id } },
      { [sequelize.Op.or]: whereOr }
    ];
  } else {
    where[sequelize.Op.or] = whereOr;
  }

  const found = await User.findOne({ where, transaction });

  if (!found) {
    return true;
  }

  ctx.status = 400;
  ctx.body = {
    message: DUPLICATION_ERROR,
    fields: ['email', 'identifier'].filter(key => (found.dataValues[key] === newData[key]))
  };
}

module.exports = crudRoute.router;
