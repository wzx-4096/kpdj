// ============ 角色皮肤市场：GET 列表 / POST 发布 ============
// GET  /api/skins?role=&roles=a,b&q=&sort=new|hot&limit=&mine=1
// POST /api/skins { roleId, name, img, thumb }（Bearer 玩家 token）
// 环境变量/绑定：DB（D1）、SESSION_SECRET

const NAME_MAX = 16;
const IMG_MAX = 620000;                                   // 约 600KB 字符，前端导出 512×512 WebP
const THUMB_MAX = 110000;                                 // 约 100KB 字符，160×160 缩略图
const DAILY_LIMIT = 10;                                   // 每人每日最多上架 10 款
const ROLE_RE = /^[a-z0-9_]{2,24}$/;
const DATA_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

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
async function readJson(request) {
  try { return await request.json(); } catch (e) { return null; }
}
function nowSec() {
  return Math.floor(Date.now() / 1000);
}
async function requirePlayer(request, env) {
  if (!env.DB) return { error: fail('DB_NOT_BOUND', 'D1 数据库未绑定', 500) };
  if (!env.SESSION_SECRET) return { error: fail('NO_SESSION_SECRET', '服务端未配置 SESSION_SECRET', 500) };
  const payload = await verifyToken(bearer(request), env.SESSION_SECRET);
  if (!payload || payload.r !== 'player') return { error: fail('UNAUTHORIZED', '登录状态已失效，请重新登录', 401) };
  const row = await env.DB.prepare('SELECT pid, username, nickname, avatar FROM players WHERE pid = ?').bind(payload.s).first();
  if (!row) return { error: fail('UNAUTHORIZED', '账号不存在或已被删除', 401) };
  return { user: row };
}
async function ensureSchema(env) {
  if (schemaReady) return;
  const ddl = [
    `CREATE TABLE IF NOT EXISTS skins (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      img TEXT NOT NULL,
      thumb TEXT NOT NULL,
      author_pid TEXT NOT NULL,
      author_name TEXT NOT NULL,
      downloads INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_skins_role ON skins(role)',
    'CREATE INDEX IF NOT EXISTS idx_skins_created ON skins(created_at)'
  ];
  for (const sql of ddl) await env.DB.prepare(sql).run();
  schemaReady = true;
}
function publicSkin(row, withImg) {
  const out = {
    id: row.id,
    role: row.role,
    name: row.name,
    thumb: row.thumb,
    author_pid: row.author_pid,
    author_name: row.author_name,
    downloads: row.downloads,
    created_at: row.created_at
  };
  if (withImg) out.img = row.img;
  return out;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return fail('DB_NOT_BOUND', 'D1 数据库未绑定', 500);
  try {
    await ensureSchema(env);
    const url = new URL(request.url);
    const mine = url.searchParams.get('mine') === '1';
    const role = url.searchParams.get('role') || '';
    const roles = (url.searchParams.get('roles') || '').split(',').filter(r => ROLE_RE.test(r)).slice(0, 20);
    const q = (url.searchParams.get('q') || '').trim().slice(0, 32);
    const sort = url.searchParams.get('sort') === 'hot' ? 'hot' : 'new';
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 100));

    const where = [];
    const binds = [];
    let pid = '';
    if (mine) {
      const auth = await requirePlayer(request, env);
      if (auth.error) return auth.error;
      pid = auth.user.pid;
      where.push('author_pid = ?');
      binds.push(pid);
    }
    if (ROLE_RE.test(role)) {
      where.push('role = ?');
      binds.push(role);
    }
    if (q || roles.length) {
      const ors = [];
      if (q) { ors.push('name LIKE ?'); binds.push('%' + q + '%'); }
      if (roles.length) {
        ors.push('role IN (' + roles.map(() => '?').join(',') + ')');
        roles.forEach(r => binds.push(r));
      }
      where.push('(' + ors.join(' OR ') + ')');
    }

    const order = sort === 'hot' ? 'downloads DESC, created_at DESC' : 'created_at DESC';
    const sql = 'SELECT id, role, name, thumb, author_pid, author_name, downloads, created_at FROM skins'
      + (where.length ? ' WHERE ' + where.join(' AND ') : '')
      + ' ORDER BY ' + order + ' LIMIT ?';
    binds.push(limit);
    const rs = await env.DB.prepare(sql).bind(...binds).all();
    return json({ skins: (rs.results || []).map(r => publicSkin(r, false)) });
  } catch (e) {
    return fail('INTERNAL', '皮肤市场读取失败，请稍后重试', 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return fail('DB_NOT_BOUND', 'D1 数据库未绑定', 500);
  try {
    await ensureSchema(env);
    const auth = await requirePlayer(request, env);
    if (auth.error) return auth.error;
    const body = await readJson(request);
    if (!body) return fail('INVALID_BODY', '请求体必须为 JSON');

    const roleId = String(body.roleId == null ? '' : body.roleId).trim();
    const name = String(body.name == null ? '' : body.name).trim();
    const img = String(body.img == null ? '' : body.img);
    const thumb = String(body.thumb == null ? '' : body.thumb);

    if (!ROLE_RE.test(roleId)) return fail('INVALID_ROLE', '角色不存在');
    if (!name || name.length > NAME_MAX) return fail('INVALID_NAME', '皮肤名字需为 1-' + NAME_MAX + ' 个字符');
    if (/[\u0000-\u001f\u007f]/.test(name)) return fail('INVALID_NAME', '皮肤名字包含非法字符');
    if (!DATA_RE.test(img) || img.length > IMG_MAX) return fail('INVALID_IMAGE', '皮肤图片无效或过大（请控制在 400KB 内）');
    if (!DATA_RE.test(thumb) || thumb.length > THUMB_MAX) return fail('INVALID_THUMB', '皮肤缩略图无效或过大');

    const now = nowSec();
    const cnt = await env.DB.prepare('SELECT COUNT(*) AS n FROM skins WHERE author_pid = ? AND created_at > ?')
      .bind(auth.user.pid, now - 86400).first();
    if (cnt && cnt.n >= DAILY_LIMIT) return fail('DAILY_LIMIT', '今天发布的皮肤太多了，明天再来吧', 429);

    const id = 'sk_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const authorName = auth.user.nickname || auth.user.username;
    await env.DB.prepare(
      'INSERT INTO skins (id, role, name, img, thumb, author_pid, author_name, downloads, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)'
    ).bind(id, roleId, name, img, thumb, auth.user.pid, authorName, now).run();

    return json({ skin: publicSkin({ id, role: roleId, name, thumb, author_pid: auth.user.pid, author_name: authorName, downloads: 0, created_at: now }, true) }, 201);
  } catch (e) {
    return fail('INTERNAL', '发布失败，请稍后重试', 500);
  }
}
