// ============ 联机中继：WebSocket 直转（替代数据库轮询） ============
// 客户端先向 Pages API 申请一次性 ticket（HMAC 签名，含 pid/room/exp），
// 再连 wss://<worker>/room/<房间码>?ticket=...。
// Worker 校验签名后把连接交给该房间的 Durable Object，DO 负责把一端的消息原样转给另一端。
// 不存库、不落盘，纯内存转发，延迟通常 30-80ms。

const enc = new TextEncoder();
const dec = new TextDecoder();

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
async function verifyTicket(token, secret, room) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 2) return null;
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('HMAC', key, unb64url(parts[1]), enc.encode(parts[0]));
    if (!ok) return null;
    const payload = JSON.parse(dec.decode(unb64url(parts[0])));
    if (!payload || !payload.s || !payload.e) return null;
    if (payload.e < Math.floor(Date.now() / 1000)) return null;
    if (payload.r !== room) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') return new Response('ok');
    const m = /^\/room\/([A-Z0-9]{6})$/.exec(url.pathname);
    if (!m) return new Response('not found', { status: 404 });
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    if (!env.RELAY_SECRET) return new Response('relay not configured', { status: 500 });

    const payload = await verifyTicket(url.searchParams.get('ticket'), env.RELAY_SECRET, m[1]);
    if (!payload) return new Response('unauthorized', { status: 401 });

    const stub = env.ROOMS.get(env.ROOMS.idFromName(m[1]));
    const headers = new Headers(request.headers);
    headers.set('x-kpdj-pid', payload.s);
    return stub.fetch(new Request(url.toString(), { headers }));
  }
};

export class RoomRelay {
  constructor(state) {
    this.state = state;
    this.sockets = new Set();
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    const pid = request.headers.get('x-kpdj-pid') || '';

    // 一个房间最多两端；同一玩家重连时踢掉旧连接，避免消息重复
    const pids = new Set();
    for (const s of this.sockets) if (s.kpdjPid) pids.add(s.kpdjPid);
    for (const s of this.sockets) {
      if (s.kpdjPid === pid) {
        try { s.close(4000, 'replaced'); } catch (e) {}
        this.sockets.delete(s);
      }
    }
    pids.delete(pid);
    if (pid && !pids.has(pid) && pids.size >= 2) return new Response('room full', { status: 403 });

    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    server.accept();
    server.kpdjPid = pid;
    this.sockets.add(server);

    const drop = () => { this.sockets.delete(server); };
    server.addEventListener('close', drop);
    server.addEventListener('error', drop);
    server.addEventListener('message', ev => {
      const data = ev.data;
      if (typeof data !== 'string' || !data || data.length > 65536) return;
      for (const s of this.sockets) {
        if (s === server) continue;
        try {
          if (s.readyState === 1) s.send(data);
          else this.sockets.delete(s);
        } catch (e) {
          this.sockets.delete(s);
        }
      }
    });

    return new Response(null, { status: 101, webSocket: client });
  }
}
