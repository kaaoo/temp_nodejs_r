'use strict';

const { Settings, sequelize } = require('../../../db');

const CrudRoute = require('../../libs/crud-route');
const SettingsSchema = require('../../../db/schemas/settings');
const { getValidationSchema } = require('../../libs/schema-validation/schema');
const { onlyAdmin } = require('../middleware/auth');

const crudRoute = new CrudRoute({
  resource: 'settings',
  Model: Settings,
  schema: SettingsSchema,
  authenticated: true,
  middlewares: [onlyAdmin]
});

crudRoute.addRoute({
  path: '/',
  method: 'get',
  validate: {
    output: {
      type: 'object',
      properties: {
        settings: getValidationSchema(SettingsSchema)
      }
    }
  },
  handler: async function (ctx) {
    const currentSettings = await Settings.getCurrentSettings();
    const res = { ...currentSettings.dataValues };
    delete res.id;
    ctx.body = { settings: res };
    ctx.status = 200;
  }
});

crudRoute.addRoute({
  path: '/',
  method: 'put',
  validate: {
    body: {
      type: 'object',
      properties: {
        settings: getValidationSchema(SettingsSchema)
      }
    },
    output: {
      type: 'object',
      properties: {
        settings: getValidationSchema(SettingsSchema)
      }
    }
  },
  handler: async function (ctx) {
    const newEntity = ctx.request.body.settings;
    delete newEntity.id;

    const res = await sequelize.transaction(async transaction => {
      const currentSettings = await Settings.getCurrentSettings({ transaction });
      const updated = await currentSettings.update(newEntity, { transaction });
      return updated.dataValues;
    });

    delete res.id;
    ctx.body = {
      settings: res
    };
    ctx.status = 200;
  }
});

crudRoute.addPutRouter();

module.exports = crudRoute.router;