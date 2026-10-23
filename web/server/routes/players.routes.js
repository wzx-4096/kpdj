// ============ 玩家路由 ============
const express = require('express');
const ctrl = require('../controllers/player.controller');

const router = express.Router();

router.post('/', ctrl.createOrGet);
router.get('/:pid', ctrl.getOne);
router.put('/:pid/progress', ctrl.saveProgress);

module.exports = router;
