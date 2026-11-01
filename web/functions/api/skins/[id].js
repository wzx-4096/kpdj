// ============ 角色皮肤市场：GET 详情（下载计数）/ DELETE 作者下架 ============
// GET    /api/skins/:id
// DELETE /api/skins/:id（Bearer 玩家 token，仅作者本人）
// 环境变量/绑定：DB（D1）、SESSION_SECRET

const ID_RE = /^sk_[A-Za-z0-9]{6,32}$/;
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
function publicSkin(row) {
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    thumb: row.thumb,
    img: row.img,
    author_pid: row.author_pid,
    author_name: row.author_name,
    downloads: row.downloads,
    created_at: row.created_at
  };
}

export async function onRequestGet(context) {
  const { env, params } = context;
  if (!env.DB) return fail('DB_NOT_BOUND', 'D1 数据库未绑定', 500);
  try {
    await ensureSchema(env);
    const id = String(params.id || '');
    if (!ID_RE.test(id)) return fail('INVALID_ID', '皮肤不存在');
    const row = await env.DB.prepare('SELECT * FROM skins WHERE id = ?').bind(id).first();
    if (!row) return fail('NOT_FOUND', '皮肤不存在或已下架', 404);
    await env.DB.prepare('UPDATE skins SET downloads = downloads + 1 WHERE id = ?').bind(id).run();
    row.downloads = (row.downloads || 0) + 1;
    return json({ skin: publicSkin(row) });
  } catch (e) {
    return fail('INTERNAL', '皮肤下载失败，请稍后重试', 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  if (!env.DB) return fail('DB_NOT_BOUND', 'D1 数据库未绑定', 500);
  try {
    await ensureSchema(env);
    const auth = await requirePlayer(request, env);
    if (auth.error) return auth.error;
    const id = String(params.id || '');
    if (!ID_RE.test(id)) return fail('INVALID_ID', '皮肤不存在');
    const row = await env.DB.prepare('SELECT author_pid FROM skins WHERE id = ?').bind(id).first();
    if (!row) return fail('NOT_FOUND', '皮肤不存在或已下架', 404);
    if (row.author_pid !== auth.user.pid) return fail('FORBIDDEN', '只能下架自己发布的皮肤', 403);
    await env.DB.prepare('DELETE FROM skins WHERE id = ?').bind(id).run();
    return json({ ok: true });
  } catch (e) {
    return fail('INTERNAL', '下架失败，请稍后重试', 500);
  }
}
