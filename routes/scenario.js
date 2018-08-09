'use strict';

const { Scenario } = require('../../../db');

const CrudRoute = require('../../libs/crud-route');
const scenarioSchema = require('../../../db/schemas/scenario');

const crudRoute = new CrudRoute({
  resource: 'scenario',
  Model: Scenario,
  schema: scenarioSchema,
  authenticated: true
});

crudRoute.addFilterRouter({
  name: {
    type: 'string'
  }
});

crudRoute.addGetRouter();
crudRoute.addGetListRouter();
crudRoute.addPostRouter();
crudRoute.addPutRouter();
crudRoute.addDeleteRouter();

module.exports = crudRoute.router;
