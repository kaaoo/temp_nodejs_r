'use strict';

const config = require('../../config');
const db = require('../../../../db');

const FAQEngines = require('../../../libs/faq-engine');
const FaqEngine = config.USE_FAQ_SERVICE ? FAQEngines.FAQReason8 : FAQEngines.FAQEmpty;

const faqEngineParams = {
  userId: config.REASON8_USER_ID,
  userToken: config.REASON8_USER_TOKEN
};

const FAQ = {
  async init() {
    const knowledgeBases = await db.KnowledgeBase.findAll({});
    this.knowledgeBases = [];
    for (let i = 0; i < knowledgeBases.length; i++) {
      this.addKnowledgeBase(knowledgeBases[i].id, knowledgeBases[i].engineParams);
    }
  },

  addKnowledgeBase(knowledgeBaseId, engineParams) {
    this.knowledgeBases.push({
      id: knowledgeBaseId,
      isActive: true,
      engine: new FaqEngine({ ...faqEngineParams, ...engineParams.active })
    });
    this.knowledgeBases.push({
      id: knowledgeBaseId,
      isActive: false,
      engine: new FaqEngine({ ...faqEngineParams, ...engineParams.draft })
    });
  },

  async deleteKnowledgeBase({ knowledgeBase }) {
    const kb = this.knowledgeBases.filter(({ id }) => id === knowledgeBase.id);

    for (let i = 0; i < kb.length; i++) {
      await kb[i].engine.deleteKnowledgeBase();
    }

    this.knowledgeBases = this.knowledgeBases.filter(({ id }) => knowledgeBase.id !== id);
  },

  async getAnswer(question, { knowledgeBasesIds, fromDraft } = {}) {
    const allKnowledgeBases = !knowledgeBasesIds ? this.knowledgeBases
      : this.knowledgeBases.filter(({ id }) => knowledgeBasesIds.includes(id));
    const knowledgeBases = allKnowledgeBases.filter(({ isActive }) => (isActive === !fromDraft));

    const answers = await Promise.all(knowledgeBases.map(({ engine }) => engine.getAnswer(question)));
    const filteredAnswers = answers
      .reduce((res, curr) => res.concat(curr), [])
      .filter(({ rate, answer: { minRate } }) => rate >= (minRate / 100))
      .sort((a, b) => a.rate - b.rate);

    return filteredAnswers[0];
  },

  async createFAQKnowledgeBase(name) {
    const engineParams = FaqEngine.createKnowledgeBase({ ...faqEngineParams, name });
    return engineParams;
  },

  async createQuestion({ question }) {
    const questionData = question.toJSON();

    const kb = {
      active: this.knowledgeBases.find(({ id, isActive }) => (id === question.knowledgeBaseId) && isActive),
      draft: this.knowledgeBases.find(({ id, isActive }) => (id === question.knowledgeBaseId) && !isActive),
    };

    const extraQuestions = (questionData.extraQuestions || '')
      .split('\n')
      .map(extraQuestion => extraQuestion.trim())
      .filter(extraQuestion => !!extraQuestion.length);

    const res = {};

    res.draft = await kb.draft.engine.createQuestion({
      mainQuestion: questionData.mainQuestion,
      extraQuestions: extraQuestions,
      answer: JSON.stringify({
        questionId: questionData.id,
        minRate: questionData.minRate
      })
    });

    if (questionData.isActive) {
      res.active = await kb.active.engine.createQuestion({
        mainQuestion: questionData.mainQuestion,
        extraQuestions: extraQuestions,
        answer: JSON.stringify({
          questionId: questionData.id,
          minRate: questionData.minRate
        })
      });
    }

    return res;
  },

  async deleteQuestion({ question }) {
    const kb = {
      active: this.knowledgeBases.find(({ id, isActive }) => (id === question.knowledgeBaseId) && isActive),
      draft: this.knowledgeBases.find(({ id, isActive }) => (id === question.knowledgeBaseId) && !isActive),
    };

    const engineParams = question.engineParams;
    if (!engineParams) {
      return;
    }

    if (engineParams.draft) {
      await kb.draft.engine.deleteQuestion(engineParams.draft);
    }

    if (engineParams.active) {
      await kb.active.engine.deleteQuestion(engineParams.active);
    }
  },

  async syncQuestion({ question }) {
    const kb = {
      active: this.knowledgeBases.find(({ id, isActive }) => (id === question.knowledgeBaseId) && isActive),
      draft: this.knowledgeBases.find(({ id, isActive }) => (id === question.knowledgeBaseId) && !isActive),
    };

    const questionData = question.dataValues;
    const extraQuestions = (questionData.extraQuestions || '')
      .split('\n')
      .map(extraQuestion => extraQuestion.trim())
      .filter(extraQuestion => !!extraQuestion.length);

    const engineParams = { ...questionData.engineParams };

    const needCreateActiveAnswer = questionData.isActive && !engineParams.active;
    if (needCreateActiveAnswer) {
      engineParams.active = await kb.active.engine.createQuestion({
        mainQuestion: questionData.mainQuestion,
        extraQuestions: extraQuestions,
        answer: JSON.stringify({
          questionId: questionData.id,
          minRate: questionData.minRate
        })
      });
    }

    const needRemoveActiveAnswer = !questionData.isActive && !!engineParams.active;
    if (needRemoveActiveAnswer) {
      await kb.active.engine.deleteQuestion(engineParams.active);
      delete engineParams.active;
    }

    if (engineParams.active && !needCreateActiveAnswer) {
      const engineParamsToUpdate = await kb.active.engine.syncQuestion({
        mainQuestion: questionData.mainQuestion,
        extraQuestions: extraQuestions,
        answer: JSON.stringify({
          questionId: questionData.id,
          minRate: questionData.minRate
        }),
        engineParams: engineParams.active
      });
      if (engineParamsToUpdate) {
        engineParams.active = engineParamsToUpdate;
      }
    }

    const engineParamsToUpdate = await kb.draft.engine.syncQuestion({
      mainQuestion: questionData.mainQuestion,
      extraQuestions: extraQuestions,
      answer: JSON.stringify({
        questionId: questionData.id,
        minRate: questionData.minRate
      }),
      engineParams: engineParams.draft
    });
    if (engineParamsToUpdate) {
      engineParams.draft = engineParamsToUpdate;
    }

    return engineParams;
  }
};

module.exports = FAQ;