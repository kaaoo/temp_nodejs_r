'use strict';

const fs = require('fs');
const path = require('path');
const basename = path.basename(__filename);

module.exports = function initRoutes(app) {
  fs
    .readdirSync(path.join(__dirname))
    .filter(file => {
      return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
    })
    .forEach(file => {
      const router = require(path.join(__dirname, file));
      app.use(router.routes(), router.allowedMethods());
    });

  app.use(async (ctx, next) => {
    if (ctx.method === 'GET') {
      await ctx.render('index');
    } else {
      return next();
    }
  });
};