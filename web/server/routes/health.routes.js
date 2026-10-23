// ============ 健康检查 ============
const express = require('express');
const config = require('../config');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ ok: true, name: config.name, version: config.version, env: config.env, uptime: Math.round(process.uptime()) });
});

module.exports = router;
