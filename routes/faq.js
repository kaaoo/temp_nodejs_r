'use strict';

const router = require('koa-router')();
router.prefix('/api/faq');

const FAQ = require('../services/faq');
const { Question } = require('../../../db');
const { QUESTION_TYPES } = require('../../constants');

const { auth } = require('../middleware/auth');
const { getValidationMiddleware } = require('../../libs/crud-route/validation-middleware');

const validate = {
  query: {
    type: 'object',
    properties: {
      question: { type: 'string' },
      knowledgeBaseId: { type: 'number' }
    },
    required: ['question']
  }
};

router.get('/draft', getValidationMiddleware(validate), auth, async function(ctx) {
  const { question, knowledgeBaseId } = ctx.request.query;
  if (!question.trim().length) {
    ctx.status = 200;
    ctx.body = { answer: '', rate: 0 };
    return;
  }

  const knowledgeBasesIds = [];

  if (knowledgeBaseId) {
    knowledgeBasesIds.push(knowledgeBaseId);
  } else {
    const user = ctx.req.user;
    const knowledgeBases = await user.getKnowledgeBases();
    knowledgeBasesIds.push(...knowledgeBases.map(({ id }) => id));
  }

  const faqAnswer = await FAQ.getAnswer(question, {
    knowledgeBasesIds,
    fromDraft: true
  });

  if (!faqAnswer) {
    ctx.status = 200;
    ctx.body = { answer: '', rate: 0 };
    return;
  }

  const { answer: { questionId }, rate } = faqAnswer;
  const questionObject = await Question.findById(questionId);
  if (!questionObject) {
    ctx.status = 200;
    ctx.body = { answer: '', rate: 0 };
    return;
  }

  const res = {
    rate: Math.floor(rate * 100)
  };

  if (questionObject.type === QUESTION_TYPES.ANSWER) {
    res.answer = questionObject.dataValues.answer;
  } else {
    if (!questionObject.scenarioId) {
      res.answer = 'Сценарий для ответа на данный вопрос не задан';
    } else {
      res.answer = { scenarioId: questionObject.scenarioId };
    }
  }

  ctx.status = 200;
  ctx.body = JSON.stringify(res);
});

module.exports = router;