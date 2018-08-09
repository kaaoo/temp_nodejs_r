'use strict';

const { KnowledgeBase, Question , Sequelize: { Op } } = require('../../../db');
const { auth } = require('../middleware/auth');

const router = require('koa-router')();
router.prefix('/api/search');
router.use(auth);

router.get('/:search', async ctx => {
  const { search } = ctx.params;

  const questions = await Question.textSearch(search);
  const questionKB = await KnowledgeBase.findAll({
    where: {
      id: { [Op.in]: questions.map(e => e.knowledgeBaseId) }
    }
  });
  const itselfKB = await KnowledgeBase.textSearch(search);

  const uniqueIds = [];
  const uniqueKB = [];

  (questionKB.concat(itselfKB)).forEach(kb => {
    if (uniqueIds.indexOf(kb.id) === -1) {
      uniqueIds.push(kb.id);
      uniqueKB.push(kb);
    }
  });

  ctx.status = 200;
  ctx.body = JSON.stringify({ results: { kb: uniqueKB, questions } });
});

module.exports = router;
