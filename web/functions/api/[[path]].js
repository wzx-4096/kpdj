// ============ API 路由（Cloudflare Pages Functions + D1） ============
// 路由：
//   GET    /api/health
//   POST   /api/auth/register   { username, password }
//   POST   /api/auth/login      { username, password }
//   GET    /api/auth/me         （Bearer 玩家 token）
//   POST   /api/admin/login     { password }
//   GET    /api/admin/players   （Bearer 管理员 token）
//   DELETE /api/admin/players/:pid（Bearer 管理员 token）
// 环境变量/绑定：DB（D1）、SESSION_SECRET、ADMIN_PASS_HASH
// 密码只存 PBKDF2-SHA256 哈希（pbkdf2$迭代数$盐$哈希），不存明文。

const PBKDF2_ITER = 12000;                                  // Workers 免费版单次 10ms CPU，迭代数不能太高
const SALT_BYTES = 16;
const TTL_PLAYER = 7 * 24 * 3600;                           // 玩家 token 7 天
const TTL_ADMIN = 2 * 3600;                                 // 管理员 token 2 小时
const USERNAME_MAX = 20;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 64;

const enc = new TextEncoder();

// ---------- 基础工具 ----------
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
function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
async function sha1hex(text) {
  const buf = await crypto.subtle.digest('SHA-1', enc.encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- 密码哈希 ----------
async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
  return new Uint8Array(bits);
}
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await pbkdf2(password, salt, PBKDF2_ITER);
  return `pbkdf2$${PBKDF2_ITER}$${b64url(salt)}$${b64url(hash)}`;
}
async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iter = parseInt(parts[1], 10);
  if (!iter || iter < 1000) return false;
  const salt = unb64url(parts[2]);
  const expect = unb64url(parts[3]);
  const got = await pbkdf2(password, salt, iter);
  return equalBytes(got, expect);
}

// ---------- 签名 token（HMAC-SHA256，无状态，不需要 KV） ----------
async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function signToken(payload, secret) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body));
  return body + '.' + b64url(sig);
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
    return null;                                             // 损坏 / 非法 base64 的 token 一律视为未登录
  }
}
function bearer(request) {
  const h = request.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : '';
}
async function readJson(request) {
  try { return await request.json(); } catch (e) { return null; }
}
function clampLimit(raw, def = 200, max = 500) {
  const n = parseInt(raw, 10);
  if (!n || n < 1) return def;
  return Math.min(n, max);
}

// ---------- 业务处理 ----------
async function handleRegister(request, env) {
  if (!env.DB) return fail('DB_NOT_BOUND', 'D1 数据库未绑定', 500);
  if (!env.SESSION_SECRET) return fail('NO_SESSION_SECRET', '服务端未配置 SESSION_SECRET', 500);

  const body = await readJson(request);
  if (!body) return fail('INVALID_BODY', '请求体必须为 JSON');
  const username = String(body.username == null ? '' : body.username).trim();
  const password = String(body.password == null ? '' : body.password);

  if (username.length < 2 || username.length > USERNAME_MAX) return fail('INVALID_USERNAME', `账号需为 2-${USERNAME_MAX} 个字符`);
  if (/\s/.test(username)) return fail('INVALID_USERNAME', '账号不能包含空格');
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) return fail('INVALID_PASSWORD', `密码需为 ${PASSWORD_MIN}-${PASSWORD_MAX} 位`);

  const lower = username.toLowerCase();
  const exists = await env.DB.prepare('SELECT pid FROM players WHERE username_lower = ?').bind(lower).first();
  if (exists) return fail('USERNAME_TAKEN', '该账号已被注册', 409);

  const pid = 'p_' + (await sha1hex(lower)).slice(0, 12);
  const passHash = await hashPassword(password);
  const now = Math.floor(Date.now() / 1000);
  try {
    await env.DB.prepare(
      'INSERT INTO players (pid, username, username_lower, pass_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(pid, username, lower, passHash, now, now).run();
  } catch (e) {
    if (/UNIQUE/i.test(String(e && e.message))) return fail('USERNAME_TAKEN', '该账号已被注册', 409);
    throw e;
  }

  const token = await signToken({ s: pid, n: username, r: 'player', e: now + TTL_PLAYER }, env.SESSION_SECRET);
  return json({ token, user: { pid, username } }, 201);
}

async function handleLogin(request, env) {
  if (!env.DB) return fail('DB_NOT_BOUND', 'D1 数据库未绑定', 500);
  if (!env.SESSION_SECRET) return fail('NO_SESSION_SECRET', '服务端未配置 SESSION_SECRET', 500);

  const body = await readJson(request);
  if (!body) return fail('INVALID_BODY', '请求体必须为 JSON');
  const username = String(body.username == null ? '' : body.username).trim();
  const password = String(body.password == null ? '' : body.password);
  if (!username || !password) return fail('INVALID_CREDENTIALS', '请输入账号和密码');

  const row = await env.DB.prepare('SELECT pid, username, pass_hash FROM players WHERE username_lower = ?')
    .bind(username.toLowerCase()).first();
  if (!row || !(await verifyPassword(password, row.pass_hash))) {
    return fail('INVALID_CREDENTIALS', '账号或密码错误', 401);
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await signToken({ s: row.pid, n: row.username, r: 'player', e: now + TTL_PLAYER }, env.SESSION_SECRET);
  return json({ token, user: { pid: row.pid, username: row.username } });
}

async function handleMe(request, env) {
  if (!env.DB) return fail('DB_NOT_BOUND', 'D1 数据库未绑定', 500);
  if (!env.SESSION_SECRET) return fail('NO_SESSION_SECRET', '服务端未配置 SESSION_SECRET', 500);
  const payload = await verifyToken(bearer(request), env.SESSION_SECRET);
  if (!payload || payload.r !== 'player') return fail('UNAUTHORIZED', '登录状态已失效，请重新登录', 401);
  const row = await env.DB.prepare('SELECT pid, username FROM players WHERE pid = ?').bind(payload.s).first();
  if (!row) return fail('UNAUTHORIZED', '账号不存在或已被删除', 401);
  return json({ user: { pid: row.pid, username: row.username } });
}

async function handleAdminLogin(request, env) {
  if (!env.SESSION_SECRET) return fail('NO_SESSION_SECRET', '服务端未配置 SESSION_SECRET', 500);
  if (!env.ADMIN_PASS_HASH) return fail('NO_ADMIN_HASH', '服务端未配置 ADMIN_PASS_HASH', 500);

  const body = await readJson(request);
  if (!body) return fail('INVALID_BODY', '请求体必须为 JSON');
  const password = String(body.password == null ? '' : body.password);
  if (!password) return fail('INVALID_CREDENTIALS', '请输入管理员密码');
  if (!(await verifyPassword(password, env.ADMIN_PASS_HASH))) return fail('INVALID_CREDENTIALS', '管理员密码错误', 401);

  const now = Math.floor(Date.now() / 1000);
  const token = await signToken({ s: 'admin', r: 'admin', e: now + TTL_ADMIN }, env.SESSION_SECRET);
  return json({ token });
}

async function requireAdmin(request, env) {
  if (!env.SESSION_SECRET) return { error: fail('NO_SESSION_SECRET', '服务端未配置 SESSION_SECRET', 500) };
  const payload = await verifyToken(bearer(request), env.SESSION_SECRET);
  if (!payload || payload.r !== 'admin') return { error: fail('UNAUTHORIZED', '管理员登录已失效，请重新登录', 401) };
  return { ok: true };
}

async function handleAdminPlayers(url, request, env) {
  if (!env.DB) return fail('DB_NOT_BOUND', 'D1 数据库未绑定', 500);
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.error;

  const limit = clampLimit(url.searchParams.get('limit'));
  const [list, total] = await Promise.all([
    env.DB.prepare('SELECT pid, username, created_at, updated_at FROM players ORDER BY created_at DESC LIMIT ?').bind(limit).all(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM players').first()
  ]);
  return json({ total: (total && total.n) || 0, limit, players: (list && list.results) || [] });
}

async function handleAdminDelete(pid, request, env) {
  if (!env.DB) return fail('DB_NOT_BOUND', 'D1 数据库未绑定', 500);
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.error;
  if (!pid || !/^p_[a-f0-9]{12}$/.test(pid)) return fail('INVALID_PID', 'pid 格式非法');

  await env.DB.batch([
    env.DB.prepare('DELETE FROM leaderboard WHERE pid = ?').bind(pid),
    env.DB.prepare('DELETE FROM players WHERE pid = ?').bind(pid)
  ]);
  const gone = await env.DB.prepare('SELECT pid FROM players WHERE pid = ?').bind(pid).first();
  if (gone) return fail('DELETE_FAILED', '删除失败，请重试', 500);
  return json({ ok: true });
}

async function handleHealth(env) {
  let db = false;
  if (env.DB) {
    try { const row = await env.DB.prepare('SELECT 1 AS ok').first(); db = !!(row && row.ok); } catch (e) { db = false; }
  }
  return json({ ok: true, db, time: new Date().toISOString() });
}

// ---------- 入口 ----------
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  const method = request.method.toUpperCase();

  try {
    if (method === 'OPTIONS') return new Response(null, { status: 204 });

    if (path === '/api/health' && method === 'GET') return handleHealth(env);
    if (path === '/api/auth/register' && method === 'POST') return handleRegister(request, env);
    if (path === '/api/auth/login' && method === 'POST') return handleLogin(request, env);
    if (path === '/api/auth/me' && method === 'GET') return handleMe(request, env);
    if (path === '/api/admin/login' && method === 'POST') return handleAdminLogin(request, env);
    if (path === '/api/admin/players' && method === 'GET') return handleAdminPlayers(url, request, env);

    const del = /^\/api\/admin\/players\/([^/]+)$/.exec(path);
    if (del && method === 'DELETE') return handleAdminDelete(decodeURIComponent(del[1]), request, env);

    return fail('NOT_FOUND', '接口不存在', 404);
  } catch (e) {
    return fail('INTERNAL', '服务器内部错误', 500);
  }
}
