const Koa = require('koa');
const app = new Koa();
const views = require('koa-views');
const json = require('koa-json');
const onerror = require('koa-onerror');
const bodyparser = require('koa-bodyparser');
const logger = require('koa-logger');
const passport = require('koa-passport');

const initRoutes = require('./routes');

const { setAuthMiddleware } = require('../libs/crud-route');
const { auth: authMiddleware } = require('./middleware/auth');
setAuthMiddleware(authMiddleware);

const db = require('../../db');
const FAQ = require('./services/faq');
db.loadingDB.then(() => {
  FAQ.init();
});

// error handler
onerror(app);

// middlewares
app.use(bodyparser({
  enableTypes: ['json', 'form', 'text']
}));
app.use(json());
app.use(logger());
app.use(require('koa-static')(__dirname + '/public'));

app.use(views(__dirname + '/views', {
  extension: 'pug'
}));

app.keys = ['some secret key'];

// logger
app.use(async (ctx, next) => {
  const start = new Date();
  await next();
  const ms = new Date() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

app.use(passport.initialize());

require('koa-qs')(app);

initRoutes(app);

// error-handling
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx);
});
process.on('uncaughtException', err => {
  console.error('global exception:', err.stack || err);
});
process.on('unhandledRejection', reason => {
  console.error('unhandled promise rejection:', reason.stack || reason);
});

module.exports = app;
