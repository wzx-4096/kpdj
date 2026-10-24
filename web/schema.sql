-- ============ 卡牌对决 D1 表结构 ============
-- 执行（线上）：wrangler d1 execute kpdj-db --remote --file=./schema.sql
-- 执行（本地）：wrangler d1 execute kpdj-db --local  --file=./schema.sql

CREATE TABLE IF NOT EXISTS players (
  pid            TEXT PRIMARY KEY,          -- p_ + sha1(小写账号) 前12位
  username       TEXT NOT NULL,             -- 登录账号（保留大小写）
  username_lower TEXT NOT NULL UNIQUE,      -- 登录查重用（小写）
  pass_hash      TEXT NOT NULL,             -- pbkdf2$迭代数$盐$哈希，绝不存明文
  nickname       TEXT,                      -- 昵称（可与账号不同，未设置时用账号显示）
  avatar         TEXT,                      -- 头像 data URL（客户端压缩后的 base64）
  created_at     INTEGER NOT NULL,          -- Unix 秒
  updated_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS leaderboard (
  pid        TEXT NOT NULL,
  mode       TEXT NOT NULL,
  name       TEXT NOT NULL,
  level_id   TEXT,
  stars      INTEGER NOT NULL DEFAULT 0,
  score      INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (pid, mode)
);

CREATE INDEX IF NOT EXISTS idx_lb_mode_score ON leaderboard(mode, score DESC);

-- 好友关系：pid_a < pid_b 保证同一对玩家只有一行
CREATE TABLE IF NOT EXISTS friendships (
  pid_a        TEXT NOT NULL,
  pid_b        TEXT NOT NULL,
  requested_by TEXT NOT NULL,               -- 发起申请的 pid
  status       TEXT NOT NULL,               -- pending | accepted
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  PRIMARY KEY (pid_a, pid_b)
);

CREATE INDEX IF NOT EXISTS idx_friend_a ON friendships(pid_a, status);
CREATE INDEX IF NOT EXISTS idx_friend_b ON friendships(pid_b, status);

-- 好友私聊消息
CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  from_pid   TEXT NOT NULL,
  to_pid     TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read_at    INTEGER
);

CREATE INDEX IF NOT EXISTS idx_msg_from ON messages(from_pid, to_pid, id);
CREATE INDEX IF NOT EXISTS idx_msg_to ON messages(to_pid, read_at, id);

-- 联机房间（好友之间开房对战）
CREATE TABLE IF NOT EXISTS rooms (
  id         TEXT PRIMARY KEY,              -- 6 位房间码（大写字母数字，避开易混字符）
  host_pid   TEXT NOT NULL,
  guest_pid  TEXT,
  status     TEXT NOT NULL,                 -- waiting | picking | battle | ended
  host_role  TEXT,
  guest_role TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rooms_host ON rooms(host_pid, status);
CREATE INDEX IF NOT EXISTS idx_rooms_guest ON rooms(guest_pid, status);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status, updated_at);

-- 房间消息：WebRTC 信令 + 中继对局数据
CREATE TABLE IF NOT EXISTS room_msgs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id    TEXT NOT NULL,
  from_pid   TEXT NOT NULL,
  kind       TEXT NOT NULL,                 -- offer | answer | input | state | end | ping ...
  payload    TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_room_msgs ON room_msgs(room_id, id);
