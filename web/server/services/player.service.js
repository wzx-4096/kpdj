// ============ 玩家存档服务 ============
// pid 由玩家名确定性派生（同名 → 同一 pid），便于前端「按名字建/取」而不需要登录体系。
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const { createStore } = require('./jsonStore');

const store = createStore(path.join(config.dataDir, 'players.json'), { players: {} });

const PID_RE = /^p_[a-f0-9]{12}$/;
const NAME_MAX = 20;

function httpError(status, code, message) {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

function normalizeName(name) {
  if (typeof name !== 'string') return null;
  const n = name.trim();
  if (!n || n.length > NAME_MAX) return null;
  return n;
}

function pidOf(name) {
  return 'p_' + crypto.createHash('sha1').update(name, 'utf8').digest('hex').slice(0, 12);
}

function isValidPid(pid) {
  return typeof pid === 'string' && PID_RE.test(pid);
}

// 按名字建/取玩家：已存在直接返回，不存在则创建
function getOrCreate(name) {
  const n = normalizeName(name);
  if (!n) throw httpError(400, 'INVALID_NAME', `name 必须为 1-${NAME_MAX} 个字符的字符串`);

  const db = store.read();
  const pid = pidOf(n);
  let player = db.players[pid];
  if (!player) {
    const now = new Date().toISOString();
    player = db.players[pid] = { pid, name: n, createdAt: now, updatedAt: now, progress: {} };
    store.write(db);
  }
  return player;
}

function get(pid) {
  if (!isValidPid(pid)) throw httpError(400, 'INVALID_PID', 'pid 格式非法');
  const db = store.read();
  return db.players[pid] || null;
}

// 保存存档：progress 浅合并，体积超限直接拒绝
function saveProgress(pid, progress) {
  if (!isValidPid(pid)) throw httpError(400, 'INVALID_PID', 'pid 格式非法');
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
    throw httpError(400, 'INVALID_PROGRESS', 'progress 必须为对象');
  }
  const payload = JSON.stringify(progress);
  if (payload.length > config.progressMaxChars) {
    throw httpError(413, 'PROGRESS_TOO_LARGE', `progress 体积超过 ${config.progressMaxChars} 字符上限`);
  }

  const db = store.read();
  const player = db.players[pid];
  if (!player) throw httpError(404, 'PLAYER_NOT_FOUND', '玩家不存在');

  player.progress = Object.assign({}, player.progress, progress);
  player.updatedAt = new Date().toISOString();
  store.write(db);
  return player;
}

module.exports = { getOrCreate, get, saveProgress, isValidPid };
