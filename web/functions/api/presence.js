// ============ 好友在线状态：心跳上报 / 状态查询 ============
// POST /api/presence            心跳（Bearer 玩家 token，前端每 40 秒调用一次）
// GET  /api/presence?pids=a,b   查询在线状态（只返回自己的好友，最多 100 个）
// 环境变量/绑定：DB（D1）、SESSION_SECRET

const ONLINE_WINDOW = 100;                                // 超过 100 秒没有心跳视为离线
const MAX_PIDS = 100;
const PID_RE = /^p_[a-f0-9]{12}$/;

const enc = new TextEncoder();
let schemaReady = false;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
function fail(code, message, status = 400) {
  return json({ error: { code, message } }, status);
}
function b64url(bytes) {
  let s = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(str) {
  const s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '==='.slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
}
async function verifyToken(token, secret) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 2) return null;
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), unb64url(parts[1]), enc.encode(parts[0]));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(unb64url(parts[0])));
    if (!payload || !payload.e || payload.e < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) {
    return null;
  }
}
function bearer(request) {
  const h = request.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : '';
}
function nowSec() {
  return Math.floor(Date.now() / 1000);
}
async function requirePlayer(request, env) {
  if (!env.DB) return { error: fail('DB_NOT_BOUND', 'D1 数据库未绑定', 500) };
  if (!env.SESSION_SECRET) return { error: fail('NO_SESSION_SECRET', '服务端未配置 SESSION_SECRET', 500) };
  const payload = await verifyToken(bearer(request), env.SESSION_SECRET);
  if (!payload || payload.r !== 'player') return { error: fail('UNAUTHORIZED', '登录状态已失效，请重新登录', 401) };
  const row = await env.DB.prepare('SELECT pid FROM players WHERE pid = ?').bind(payload.s).first();
  if (!row) return { error: fail('UNAUTHORIZED', '账号不存在或已被删除', 401) };
  return { user: row };
}
async function ensureSchema(env) {
  if (schemaReady) return;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS player_presence (
      pid       TEXT PRIMARY KEY,
      last_seen INTEGER NOT NULL
    )`
  ).run();
  schemaReady = true;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return fail('DB_NOT_BOUND', 'D1 数据库未绑定', 500);
  try {
    await ensureSchema(env);
    const auth = await requirePlayer(request, env);
    if (auth.error) return auth.error;
    const now = nowSec();
    await env.DB.prepare(
      'INSERT INTO player_presence (pid, last_seen) VALUES (?, ?) ON CONFLICT(pid) DO UPDATE SET last_seen = excluded.last_seen'
    ).bind(auth.user.pid, now).run();
    return json({ ok: true, now });
  } catch (e) {
    return fail('INTERNAL', '在线状态上报失败，请稍后重试', 500);
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return fail('DB_NOT_BOUND', 'D1 数据库未绑定', 500);
  try {
    await ensureSchema(env);
    const auth = await requirePlayer(request, env);
    if (auth.error) return auth.error;
    const me = auth.user.pid;

    const url = new URL(request.url);
    const pids = (url.searchParams.get('pids') || '')
      .split(',').filter(p => PID_RE.test(p) && p !== me).slice(0, MAX_PIDS);
    if (!pids.length) return json({ presence: {}, server_time: nowSec() });

    // 只允许查询自己的好友：先取全部 accepted 好友，再过滤请求的 pid
    const fr = await env.DB.prepare(
      "SELECT pid_a, pid_b FROM friendships WHERE status = 'accepted' AND (pid_a = ? OR pid_b = ?)"
    ).bind(me, me).all();
    const allowed = {};
    ((fr && fr.results) || []).forEach(r => {
      const other = r.pid_a === me ? r.pid_b : r.pid_a;
      allowed[other] = 1;
    });
    const targets = pids.filter(p => allowed[p]);
    if (!targets.length) return json({ presence: {}, server_time: nowSec() });

    const rows = await env.DB.prepare(
      'SELECT pid, last_seen FROM player_presence WHERE pid IN (' + targets.map(() => '?').join(',') + ')'
    ).bind(...targets).all();
    const seen = {};
    ((rows && rows.results) || []).forEach(r => { seen[r.pid] = r.last_seen || 0; });

    const now = nowSec();
    const presence = {};
    targets.forEach(p => {
      const last = seen[p] || 0;
      presence[p] = { online: last > 0 && now - last <= ONLINE_WINDOW, last_seen: last };
    });
    return json({ presence, server_time: now });
  } catch (e) {
    return fail('INTERNAL', '在线状态读取失败，请稍后重试', 500);
  }
}
