// ============ 排行榜路由 ============
const express = require('express');
const ctrl = require('../controllers/leaderboard.controller');

const router = express.Router();

router.get('/', ctrl.list);
router.post('/', ctrl.submit);

module.exports = router;
