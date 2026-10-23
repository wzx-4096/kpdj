-- ============ 卡牌对决 D1 表结构 ============
-- 执行（线上）：wrangler d1 execute kpdj-db --remote --file=./schema.sql
-- 执行（本地）：wrangler d1 execute kpdj-db --local  --file=./schema.sql

CREATE TABLE IF NOT EXISTS players (
  pid            TEXT PRIMARY KEY,          -- p_ + sha1(小写账号) 前12位
  username       TEXT NOT NULL,             -- 显示用账号（保留大小写）
  username_lower TEXT NOT NULL UNIQUE,      -- 登录查重用（小写）
  pass_hash      TEXT NOT NULL,             -- pbkdf2$迭代数$盐$哈希，绝不存明文
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
