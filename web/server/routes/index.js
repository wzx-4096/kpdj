// ============ 路由汇总 ============
const express = require('express');

const router = express.Router();

router.use('/health', require('./health.routes'));
router.use('/players', require('./players.routes'));
router.use('/leaderboard', require('./leaderboard.routes'));

module.exports = router;
