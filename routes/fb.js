'use strict';

const { answer } = require('./bot/answer');
const { getProcessingScenarioDialog, processScenarioAnswer } = require('./bot/scenario');

const { FB_VERIFY_TOKEN } = require('../config');

const router = require('koa-router')();
router.prefix('/api/fb');

async function processUserEvent(entry) {
  const webhook_event = entry.messaging[0];
  const sender_psid = webhook_event.sender.id;

  if (!webhook_event.message) {
    return;
  }

  const userData = { psid: sender_psid, platform: 'facebook' };
  const message = webhook_event.message.text;

  // already in collecting data process
  const scenarioDialog = await getProcessingScenarioDialog(userData);
  if (scenarioDialog) {
    await processScenarioAnswer({ message, scenarioDialog });
    return;
  }

  await answer({ question: message, userData });
}

router.post('/webhook', async ctx => {
  const body = ctx.request.body;

  // Checks this is an event from a page subscription
  if (body.object !== 'page') {
    ctx.status = 404;
    return;
  }

  const processing = async () => {
    for (let i = 0; i < body.entry.length; i++) {
      await processUserEvent(body.entry[i]);
    }
  };

  processing(); // without waiting for answer
  // Returns a '200 OK' response to all requests
  ctx.status = 200;
  ctx.body = 'EVENT_RECEIVED';
});

router.get('/webhook', async ctx => {
  let mode = ctx.query['hub.mode'];
  let token = ctx.query['hub.verify_token'];
  let challenge = ctx.query['hub.challenge'];

  if (mode && token) {
    if ((mode === 'subscribe') && (token === FB_VERIFY_TOKEN)) {
      ctx.status = 200;
    	ctx.body = challenge;
    } else {
      ctx.status = 403;   
    }
  }
});

module.exports = router;