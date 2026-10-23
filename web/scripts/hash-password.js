// ============ 密码哈希生成（PBKDF2-SHA256，与 functions/api/[[path]].js 格式一致） ============
// 用途：生成管理员密码哈希，供 `wrangler pages secret put ADMIN_PASS_HASH` 使用。
// 用法：node scripts/hash-password.js 你的管理员密码
// 输出形如：pbkdf2$12000$<盐base64url>$<哈希base64url>
const crypto = require('crypto');

const ITER = 12000;

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const pwd = process.argv.slice(2).join(' ');
if (!pwd) {
  console.error('用法：node scripts/hash-password.js 你的管理员密码');
  process.exit(1);
}

const salt = crypto.randomBytes(16);
const hash = crypto.pbkdf2Sync(pwd, salt, ITER, 32, 'sha256');
console.log(`pbkdf2$${ITER}$${b64url(salt)}$${b64url(hash)}`);
