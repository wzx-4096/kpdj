// ============ 全局配置 ============
// 统一读取环境变量并解析所有关键路径，供后端各模块引用。
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const ROOT = path.resolve(__dirname, '../..');
const pkg = require('../../package.json');

module.exports = {
  name: pkg.name,
  version: pkg.version,
  root: ROOT,
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jsonLimit: process.env.JSON_LIMIT || '256kb',
  // 前端静态资源目录（Express 托管）
  publicDir: path.join(ROOT, 'public'),
  // 混淆发布产物目录
  distDir: path.join(ROOT, 'dist'),
  // 运行时数据目录（存档/排行 JSON 落盘位置）
  dataDir: path.join(ROOT, 'server', 'data'),
  // 单份存档体积上限（字符数），防止恶意灌爆 JSON 文件
  progressMaxChars: 32 * 1024
};
