// ============ 排行榜服务 ============
// 存储结构：{ entries: { [mode]: { [pid]: entry } } }，同一玩家同模式只保留最高分。
const path = require('path');
const config = require('../config');
const { createStore } = require('./jsonStore');
const playerService = require('./player.service');

const store = createStore(path.join(config.dataDir, 'leaderboard.json'), { entries: {} });

const MODE_MAX = 24;
const DEFAULT_LIMIT = 50;
const LIMIT_MAX = 200;

function httpError(status, code, message) {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

function normalizeMode(mode, required) {
  if (mode === undefined || mode === null || String(mode).trim() === '') {
    if (!required) return '';
    throw httpError(400, 'INVALID_MODE', 'mode 不能为空');
  }
  if (typeof mode !== 'string' || mode.length > MODE_MAX) {
    throw httpError(400, 'INVALID_MODE', `mode 必须为不超过 ${MODE_MAX} 字符的字符串`);
  }
  return mode.trim();
}

function toScore(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1e9) {
    throw httpError(400, 'INVALID_SCORE', 'score 必须为 0 ~ 1e9 之间的数值');
  }
  return Math.round(n);
}

function toStars(v) {
  if (v === undefined || v === null || v === '') return 0;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 5) throw httpError(400, 'INVALID_STARS', 'stars 必须为 0-5 的整数');
  return n;
}

// 提交成绩：pid 必须已存在（先 POST /api/players 建号），入榜取最高分
function submit(input) {
  const body = input || {};
  if (!playerService.isValidPid(body.pid)) throw httpError(400, 'INVALID_PID', 'pid 格式非法');

  const player = playerService.get(body.pid);
  if (!player) throw httpError(404, 'PLAYER_NOT_FOUND', '玩家不存在，请先创建玩家');

  const mode = normalizeMode(body.mode, true);
  const entry = {
    pid: player.pid,
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 20) : player.name,
    mode,
    levelId: body.levelId === undefined || body.levelId === null ? '' : String(body.levelId).slice(0, 40),
    stars: toStars(body.stars),
    score: toScore(body.score),
    updatedAt: new Date().toISOString()
  };

  const db = store.read();
  db.entries[mode] = db.entries[mode] || {};
  const prev = db.entries[mode][entry.pid];
  if (!prev || entry.score > prev.score) {
    db.entries[mode][entry.pid] = Object.assign({}, entry, {
      createdAt: prev ? prev.createdAt : entry.updatedAt
    });
    store.write(db);
  }
  return db.entries[mode][entry.pid];
}

// 查询排行：按 score 降序、同分先达成者在前
// mode 留空返回「全局榜」（跨模式取各玩家最高分），指定 mode 则只返回该模式
function list(query) {
  const q = query || {};
  const mode = normalizeMode(q.mode, false);

  let limit = q.limit === undefined || q.limit === '' ? DEFAULT_LIMIT : Number(q.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > LIMIT_MAX) {
    throw httpError(400, 'INVALID_LIMIT', `limit 必须为 1-${LIMIT_MAX} 的整数`);
  }

  const db = store.read();
  let rows;
  if (mode) {
    rows = Object.values(db.entries[mode] || {});
  } else {
    const best = new Map();
    for (const bucket of Object.values(db.entries)) {
      for (const e of Object.values(bucket)) {
        const cur = best.get(e.pid);
        if (!cur || e.score > cur.score) best.set(e.pid, e);
      }
    }
    rows = [...best.values()];
  }

  return rows
    .sort((a, b) => (b.score - a.score) || String(a.createdAt).localeCompare(String(b.createdAt)))
    .slice(0, limit)
    .map((e, i) => Object.assign({ rank: i + 1 }, e));
}

module.exports = { submit, list };
