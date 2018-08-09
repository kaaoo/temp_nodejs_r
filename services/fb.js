'use strict';

const request = require('../../libs/request');
const { FB_TOKEN: PAGE_ACCESS_TOKEN } = require('../config');

async function sendMessage(sender_psid, message) {
  let request_body = {
    recipient: {
      id: sender_psid
    },
    message: {
      text: message
    }
  };

  try {
    const res = await request
      .post('https://graph.facebook.com/v2.6/me/messages')
      .accept('json')
      .query({
        access_token: PAGE_ACCESS_TOKEN
      })
      .send(request_body);

    return res.body;
  } catch (e) {
    console.error('facebook sendMessage error');
  }

  return null;
}

async function getProfileInfo(psid) {
  try {
    const res = await request
      .get(`https://graph.facebook.com/v2.6/${psid}?fields=first_name,last_name&access_token=${PAGE_ACCESS_TOKEN}`)
      .accept('json');

    const { first_name, last_name } = res.body;
    return { firstName: first_name, lastName: last_name, psid };
  } catch (err) {
    console.error('facebook getProfileInfo error', err.text);
    return { psid };
  }
}


module.exports = {
  sendMessage,
  getProfileInfo
};