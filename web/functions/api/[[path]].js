// ============ API 路由（Cloudflare Pages Functions + D1） ============
// 路由：
//   GET    /api/health
//   POST   /api/auth/register   { username, password }
//   POST   /api/auth/login      { username, password }
//   GET    /api/auth/me         （Bearer 玩家 token）
//   PATCH  /api/auth/profile    { nickname, avatar }
//   POST   /api/auth/password   { oldPassword, newPassword }
//   GET    /api/users/search?q=
//   GET    /api/friends
//   POST   /api/friends/request { pid }
//   POST   /api/friends/accept  { pid }
//   POST   /api/friends/reject  { pid }
//   DELETE /api/friends/:pid
//   GET    /api/messages?with=&after=
//   POST   /api/messages        { to, body }
//   GET    /api/messages/unread
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
const NICKNAME_MAX = 16;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 64;
const AVATAR_MAX = 80000;                                   // 头像 data URL 长度上限（约 80KB）
const MSG_MAX = 500;
const PID_RE = /^p_[a-f0-9]{12}$/;

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
function publicUser(row) {
  return { pid: row.pid, username: row.username, nickname: row.nickname || row.username, avatar: row.avatar || '' };
}
function pairOf(a, b) {
  return a < b ? [a, b] : [b, a];
}
function normalizeNickname(raw) {
  if (typeof raw !== 'string') return null;
  const n = raw.trim();
  if (!n || n.length > NICKNAME_MAX) return null;
  if (/[\u0000-\u001f\u007f]/.test(n)) return null;
  return n;
}
function validAvatar(v) {
  if (v === '') return true;
  if (typeof v !== 'string' || v.length > AVATAR_MAX) return false;
  return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v);
}
function nowSec() {
  return Math.floor(Date.now() / 1000);
}

// ---------- 鉴权 ----------
async function requirePlayer(request, env) {
  if (!env.DB) return { error: fail('DB_NOT_BOUND', 'D1 数据库未绑定', 500) };
  if (!env.SESSION_SECRET) return { error: fail('NO_SESSION_SECRET', '服务端未配置 SESSION_SECRET', 500) };
  const payload = await verifyToken(bearer(request), env.SESSION_SECRET);
  if (!payload || payload.r !== 'player') return { error: fail('UNAUTHORIZED', '登录状态已失效，请重新登录', 401) };
  const row = await env.DB.prepare('SELECT pid, username, nickname, avatar FROM players WHERE pid = ?').bind(payload.s).first();
  if (!row) return { error: fail('UNAUTHORIZED', '账号不存在或已被删除', 401) };
  return { user: row };
}
async function requireAdmin(request, env) {
  if (!env.SESSION_SECRET) return { error: fail('NO_SESSION_SECRET', '服务端未配置 SESSION_SECRET', 500) };
  const payload = await verifyToken(bearer(request), env.SESSION_SECRET);
  if (!payload || payload.r !== 'admin') return { error: fail('UNAUTHORIZED', '管理员登录已失效，请重新登录', 401) };
  return { ok: true };
}
async function friendRow(env, a, b) {
  const [pa, pb] = pairOf(a, b);
  return env.DB.prepare('SELECT pid_a, pid_b, requested_by, status FROM friendships WHERE pid_a = ? AND pid_b = ?').bind(pa, pb).first();
}
async function areFriends(env, a, b) {
  const row = await friendRow(env, a, b);
  return !!(row && row.status === 'accepted');
}

// ---------- 账号 ----------
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
  const now = nowSec();
  try {
    await env.DB.prepare(
      'INSERT INTO players (pid, username, username_lower, pass_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(pid, username, lower, passHash, now, now).run();
  } catch (e) {
    if (/UNIQUE/i.test(String(e && e.message))) return fail('USERNAME_TAKEN', '该账号已被注册', 409);
    throw e;
  }

  const token = await signToken({ s: pid, n: username, r: 'player', e: now + TTL_PLAYER }, env.SESSION_SECRET);
  return json({ token, user: { pid, username, nickname: username, avatar: '' } }, 201);
}

async function handleLogin(request, env) {
  if (!env.DB) return fail('DB_NOT_BOUND', 'D1 数据库未绑定', 500);
  if (!env.SESSION_SECRET) return fail('NO_SESSION_SECRET', '服务端未配置 SESSION_SECRET', 500);

  const body = await readJson(request);
  if (!body) return fail('INVALID_BODY', '请求体必须为 JSON');
  const username = String(body.username == null ? '' : body.username).trim();
  const password = String(body.password == null ? '' : body.password);
  if (!username || !password) return fail('INVALID_CREDENTIALS', '请输入账号和密码');

  const row = await env.DB.prepare('SELECT pid, username, nickname, avatar, pass_hash FROM players WHERE username_lower = ?')
    .bind(username.toLowerCase()).first();
  if (!row || !(await verifyPassword(password, row.pass_hash))) {
    return fail('INVALID_CREDENTIALS', '账号或密码错误', 401);
  }

  const token = await signToken({ s: row.pid, n: row.username, r: 'player', e: nowSec() + TTL_PLAYER }, env.SESSION_SECRET);
  return json({ token, user: publicUser(row) });
}

async function handleMe(request, env) {
  const auth = await requirePlayer(request, env);
  if (auth.error) return auth.error;
  return json({ user: publicUser(auth.user) });
}

async function handleUpdateProfile(request, env) {
  const auth = await requirePlayer(request, env);
  if (auth.error) return auth.error;

  const body = await readJson(request);
  if (!body) return fail('INVALID_BODY', '请求体必须为 JSON');

  let nickname = auth.user.nickname;
  let avatar = auth.user.avatar;
  if (Object.prototype.hasOwnProperty.call(body, 'nickname')) {
    const raw = String(body.nickname == null ? '' : body.nickname);
    if (!raw.trim()) {
      nickname = null;                                       // 留空 = 恢复用账号名显示
    } else {
      nickname = normalizeNickname(raw);
      if (!nickname) return fail('INVALID_NICKNAME', `昵称需为 1-${NICKNAME_MAX} 个字符`);
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, 'avatar')) {
    const raw = String(body.avatar == null ? '' : body.avatar);
    if (!validAvatar(raw)) return fail('INVALID_AVATAR', '头像格式不支持或体积过大', 413);
    avatar = raw || null;
  }

  await env.DB.prepare('UPDATE players SET nickname = ?, avatar = ?, updated_at = ? WHERE pid = ?')
    .bind(nickname, avatar, nowSec(), auth.user.pid).run();
  return json({ user: publicUser({ pid: auth.user.pid, username: auth.user.username, nickname, avatar }) });
}

async function handleChangePassword(request, env) {
  const auth = await requirePlayer(request, env);
  if (auth.error) return auth.error;

  const body = await readJson(request);
  if (!body) return fail('INVALID_BODY', '请求体必须为 JSON');
  const oldPassword = String(body.oldPassword == null ? '' : body.oldPassword);
  const newPassword = String(body.newPassword == null ? '' : body.newPassword);
  if (!oldPassword) return fail('INVALID_PASSWORD', '请输入当前密码');
  if (newPassword.length < PASSWORD_MIN || newPassword.length > PASSWORD_MAX) {
    return fail('INVALID_PASSWORD', `新密码需为 ${PASSWORD_MIN}-${PASSWORD_MAX} 位`);
  }
  if (oldPassword === newPassword) return fail('INVALID_PASSWORD', '新密码不能与当前密码相同');

  const row = await env.DB.prepare('SELECT pass_hash FROM players WHERE pid = ?').bind(auth.user.pid).first();
  if (!row || !(await verifyPassword(oldPassword, row.pass_hash))) return fail('WRONG_PASSWORD', '当前密码错误', 401);

  const hash = await hashPassword(newPassword);
  await env.DB.prepare('UPDATE players SET pass_hash = ?, updated_at = ? WHERE pid = ?')
    .bind(hash, nowSec(), auth.user.pid).run();
  return json({ ok: true });
}

// ---------- 用户搜索 / 好友 ----------
function relationOf(row, me) {
  if (!row || !row.status) return 'none';
  if (row.status === 'accepted') return 'friend';
  return row.requested_by === me ? 'outgoing' : 'incoming';
}

async function handleUserSearch(url, request, env) {
  const auth = await requirePlayer(request, env);
  if (auth.error) return auth.error;

  const q = String(url.searchParams.get('q') || '').trim();
  if (!q) return json({ users: [] });
  if (q.length > USERNAME_MAX) return fail('INVALID_QUERY', '搜索词过长');
  const escaped = q.replace(/[\\%_]/g, m => '\\' + m);
  const like = '%' + escaped + '%';
  const me = auth.user.pid;

  const rows = await env.DB.prepare(
    `SELECT p.pid, p.username, p.nickname, p.avatar,
            f.requested_by, f.status
       FROM players p
       LEFT JOIN friendships f
         ON (f.pid_a = ? AND f.pid_b = p.pid) OR (f.pid_b = ? AND f.pid_a = p.pid)
      WHERE p.pid != ?
        AND (p.username_lower LIKE ? ESCAPE '\\' OR lower(COALESCE(p.nickname, p.username)) LIKE ? ESCAPE '\\')
      ORDER BY p.username_lower
      LIMIT 10`
  ).bind(me, me, me, like, like).all();

  const users = ((rows && rows.results) || []).map(r => ({
    pid: r.pid, username: r.username, nickname: r.nickname || r.username, avatar: r.avatar || '',
    relation: relationOf(r, me)
  }));
  return json({ users });
}

async function handleFriends(request, env) {
  const auth = await requirePlayer(request, env);
  if (auth.error) return auth.error;
  const me = auth.user.pid;

  const rows = await env.DB.prepare(
    `SELECT f.pid_a, f.pid_b, f.requested_by, f.status, f.updated_at,
            p.pid AS o_pid, p.username AS o_username, p.nickname AS o_nickname, p.avatar AS o_avatar
       FROM friendships f
       JOIN players p ON p.pid = CASE WHEN f.pid_a = ? THEN f.pid_b ELSE f.pid_a END
      WHERE f.pid_a = ? OR f.pid_b = ?`
  ).bind(me, me, me).all();

  const friends = [], incoming = [], outgoing = [];
  ((rows && rows.results) || []).forEach(r => {
    const item = {
      pid: r.o_pid, username: r.o_username, nickname: r.o_nickname || r.o_username,
      avatar: r.o_avatar || '', since: r.updated_at
    };
    if (r.status === 'accepted') friends.push(item);
    else if (r.requested_by === me) outgoing.push(item);
    else incoming.push(item);
  });

  const unreadRows = await env.DB.prepare(
    'SELECT from_pid, COUNT(*) AS n FROM messages WHERE to_pid = ? AND read_at IS NULL GROUP BY from_pid'
  ).bind(me).all();
  const by = {};
  let total = 0;
  ((unreadRows && unreadRows.results) || []).forEach(r => { by[r.from_pid] = r.n; total += r.n; });
  friends.forEach(f => { f.unread = by[f.pid] || 0; });

  friends.sort((a, b) => (b.unread - a.unread) || a.nickname.localeCompare(b.nickname, 'zh'));
  return json({ friends, incoming, outgoing, unread: { total, by } });
}

async function handleFriendRequest(request, env) {
  const auth = await requirePlayer(request, env);
  if (auth.error) return auth.error;

  const body = await readJson(request);
  if (!body) return fail('INVALID_BODY', '请求体必须为 JSON');
  const target = String(body.pid == null ? '' : body.pid);
  if (!PID_RE.test(target)) return fail('INVALID_PID', 'pid 格式非法');
  if (target === auth.user.pid) return fail('INVALID_TARGET', '不能添加自己为好友');

  const exists = await env.DB.prepare('SELECT pid FROM players WHERE pid = ?').bind(target).first();
  if (!exists) return fail('USER_NOT_FOUND', '该玩家不存在', 404);

  const row = await friendRow(env, auth.user.pid, target);
  const now = nowSec();
  if (row && row.status === 'accepted') return fail('ALREADY_FRIENDS', '你们已经是好友了', 409);
  if (row && row.requested_by === auth.user.pid) return fail('REQUEST_SENT', '好友申请已发送', 409);
  if (row) {
    await env.DB.prepare('UPDATE friendships SET status = ?, updated_at = ? WHERE pid_a = ? AND pid_b = ?')
      .bind('accepted', now, row.pid_a, row.pid_b).run();
    return json({ status: 'accepted' });
  }

  const [pa, pb] = pairOf(auth.user.pid, target);
  await env.DB.prepare(
    'INSERT INTO friendships (pid_a, pid_b, requested_by, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(pa, pb, auth.user.pid, 'pending', now, now).run();
  return json({ status: 'pending' }, 201);
}

async function handleFriendAccept(request, env) {
  const auth = await requirePlayer(request, env);
  if (auth.error) return auth.error;

  const body = await readJson(request);
  if (!body) return fail('INVALID_BODY', '请求体必须为 JSON');
  const target = String(body.pid == null ? '' : body.pid);
  if (!PID_RE.test(target)) return fail('INVALID_PID', 'pid 格式非法');

  const row = await friendRow(env, auth.user.pid, target);
  if (!row || row.status !== 'pending') return fail('REQUEST_NOT_FOUND', '好友申请不存在', 404);
  if (row.requested_by !== target) return fail('FORBIDDEN', '无权处理该申请', 403);

  await env.DB.prepare('UPDATE friendships SET status = ?, updated_at = ? WHERE pid_a = ? AND pid_b = ?')
    .bind('accepted', nowSec(), row.pid_a, row.pid_b).run();
  return json({ ok: true });
}

async function handleFriendReject(request, env) {
  const auth = await requirePlayer(request, env);
  if (auth.error) return auth.error;

  const body = await readJson(request);
  if (!body) return fail('INVALID_BODY', '请求体必须为 JSON');
  const target = String(body.pid == null ? '' : body.pid);
  if (!PID_RE.test(target)) return fail('INVALID_PID', 'pid 格式非法');

  const row = await friendRow(env, auth.user.pid, target);
  if (!row || row.status !== 'pending') return fail('REQUEST_NOT_FOUND', '好友申请不存在', 404);
  if (row.requested_by !== target) return fail('FORBIDDEN', '无权处理该申请', 403);

  await env.DB.prepare('DELETE FROM friendships WHERE pid_a = ? AND pid_b = ?').bind(row.pid_a, row.pid_b).run();
  return json({ ok: true });
}

async function handleFriendRemove(target, request, env) {
  const auth = await requirePlayer(request, env);
  if (auth.error) return auth.error;
  if (!PID_RE.test(target)) return fail('INVALID_PID', 'pid 格式非法');

  const row = await friendRow(env, auth.user.pid, target);
  if (!row) return fail('FRIEND_NOT_FOUND', '好友关系不存在', 404);
  await env.DB.prepare('DELETE FROM friendships WHERE pid_a = ? AND pid_b = ?').bind(row.pid_a, row.pid_b).run();
  return json({ ok: true });
}

// ---------- 私聊消息 ----------
async function handleMessagesGet(url, request, env) {
  const auth = await requirePlayer(request, env);
  if (auth.error) return auth.error;
  const me = auth.user.pid;
  const withPid = String(url.searchParams.get('with') || '');
  if (!PID_RE.test(withPid)) return fail('INVALID_PID', 'pid 格式非法');
  if (!(await areFriends(env, me, withPid))) return fail('NOT_FRIENDS', '对方不是你的好友', 403);

  const after = parseInt(url.searchParams.get('after'), 10) || 0;
  await env.DB.prepare('UPDATE messages SET read_at = ? WHERE to_pid = ? AND from_pid = ? AND read_at IS NULL')
    .bind(nowSec(), me, withPid).run();

  const rows = await env.DB.prepare(
    `SELECT * FROM (
       SELECT id, from_pid, to_pid, body, created_at
         FROM messages
        WHERE ((from_pid = ? AND to_pid = ?) OR (from_pid = ? AND to_pid = ?)) AND id > ?
        ORDER BY id DESC
        LIMIT 100
     ) ORDER BY id ASC`
  ).bind(me, withPid, withPid, me, after).all();

  return json({ messages: (rows && rows.results) || [] });
}

async function handleMessageSend(request, env) {
  const auth = await requirePlayer(request, env);
  if (auth.error) return auth.error;

  const body = await readJson(request);
  if (!body) return fail('INVALID_BODY', '请求体必须为 JSON');
  const to = String(body.to == null ? '' : body.to);
  const text = String(body.body == null ? '' : body.body).trim();
  if (!PID_RE.test(to)) return fail('INVALID_PID', 'pid 格式非法');
  if (to === auth.user.pid) return fail('INVALID_TARGET', '不能给自己发消息');
  if (!text) return fail('EMPTY_MESSAGE', '消息不能为空');
  if (text.length > MSG_MAX) return fail('MESSAGE_TOO_LONG', `消息不能超过 ${MSG_MAX} 字`);
  if (!(await areFriends(env, auth.user.pid, to))) return fail('NOT_FRIENDS', '对方不是你的好友', 403);

  const exists = await env.DB.prepare('SELECT pid FROM players WHERE pid = ?').bind(to).first();
  if (!exists) return fail('USER_NOT_FOUND', '该玩家不存在', 404);

  const now = nowSec();
  const res = await env.DB.prepare('INSERT INTO messages (from_pid, to_pid, body, created_at) VALUES (?, ?, ?, ?)')
    .bind(auth.user.pid, to, text, now).run();
  const id = res && res.meta ? res.meta.last_row_id : 0;
  return json({ message: { id, from_pid: auth.user.pid, to_pid: to, body: text, created_at: now } }, 201);
}

async function handleMessagesUnread(request, env) {
  const auth = await requirePlayer(request, env);
  if (auth.error) return auth.error;
  const rows = await env.DB.prepare(
    'SELECT from_pid, COUNT(*) AS n FROM messages WHERE to_pid = ? AND read_at IS NULL GROUP BY from_pid'
  ).bind(auth.user.pid).all();
  const by = {};
  let total = 0;
  ((rows && rows.results) || []).forEach(r => { by[r.from_pid] = r.n; total += r.n; });
  return json({ total, by });
}

// ---------- 管理员 ----------
async function handleAdminLogin(request, env) {
  if (!env.SESSION_SECRET) return fail('NO_SESSION_SECRET', '服务端未配置 SESSION_SECRET', 500);
  if (!env.ADMIN_PASS_HASH) return fail('NO_ADMIN_HASH', '服务端未配置 ADMIN_PASS_HASH', 500);

  const body = await readJson(request);
  if (!body) return fail('INVALID_BODY', '请求体必须为 JSON');
  const password = String(body.password == null ? '' : body.password);
  if (!password) return fail('INVALID_CREDENTIALS', '请输入管理员密码');
  if (!(await verifyPassword(password, env.ADMIN_PASS_HASH))) return fail('INVALID_CREDENTIALS', '管理员密码错误', 401);

  const token = await signToken({ s: 'admin', r: 'admin', e: nowSec() + TTL_ADMIN }, env.SESSION_SECRET);
  return json({ token });
}

async function handleAdminPlayers(url, request, env) {
  if (!env.DB) return fail('DB_NOT_BOUND', 'D1 数据库未绑定', 500);
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.error;

  const limit = clampLimit(url.searchParams.get('limit'));
  const [list, total] = await Promise.all([
    env.DB.prepare('SELECT pid, username, nickname, created_at, updated_at FROM players ORDER BY created_at DESC LIMIT ?').bind(limit).all(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM players').first()
  ]);
  return json({ total: (total && total.n) || 0, limit, players: (list && list.results) || [] });
}

async function handleAdminDelete(pid, request, env) {
  if (!env.DB) return fail('DB_NOT_BOUND', 'D1 数据库未绑定', 500);
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.error;
  if (!pid || !PID_RE.test(pid)) return fail('INVALID_PID', 'pid 格式非法');

  await env.DB.batch([
    env.DB.prepare('DELETE FROM messages WHERE from_pid = ? OR to_pid = ?').bind(pid, pid),
    env.DB.prepare('DELETE FROM friendships WHERE pid_a = ? OR pid_b = ?').bind(pid, pid),
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
    if (path === '/api/auth/profile' && method === 'PATCH') return handleUpdateProfile(request, env);
    if (path === '/api/auth/password' && method === 'POST') return handleChangePassword(request, env);
    if (path === '/api/users/search' && method === 'GET') return handleUserSearch(url, request, env);
    if (path === '/api/friends' && method === 'GET') return handleFriends(request, env);
    if (path === '/api/friends/request' && method === 'POST') return handleFriendRequest(request, env);
    if (path === '/api/friends/accept' && method === 'POST') return handleFriendAccept(request, env);
    if (path === '/api/friends/reject' && method === 'POST') return handleFriendReject(request, env);
    if (path === '/api/messages/unread' && method === 'GET') return handleMessagesUnread(request, env);
    if (path === '/api/messages' && method === 'GET') return handleMessagesGet(url, request, env);
    if (path === '/api/messages' && method === 'POST') return handleMessageSend(request, env);
    if (path === '/api/admin/login' && method === 'POST') return handleAdminLogin(request, env);
    if (path === '/api/admin/players' && method === 'GET') return handleAdminPlayers(url, request, env);

    const friendDel = /^\/api\/friends\/([^/]+)$/.exec(path);
    if (friendDel && method === 'DELETE') return handleFriendRemove(decodeURIComponent(friendDel[1]), request, env);

    const del = /^\/api\/admin\/players\/([^/]+)$/.exec(path);
    if (del && method === 'DELETE') return handleAdminDelete(decodeURIComponent(del[1]), request, env);

    return fail('NOT_FOUND', '接口不存在', 404);
  } catch (e) {
    return fail('INTERNAL', '服务器内部错误', 500);
  }
}
