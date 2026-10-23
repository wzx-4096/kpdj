// ============ Express 应用装配 ============
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const routes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

function createApp() {
  const app = express();
  app.disable('x-powered-by');

  // 跨域：'*' → 放行全部；也可配置为逗号分隔的白名单
  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map(s => s.trim()) }));
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: config.jsonLimit }));
  app.use(express.urlencoded({ extended: false, limit: config.jsonLimit }));

  // 前端静态资源（public/）：支持 /css/... /js/... /images/... 等
  app.use(express.static(config.publicDir, { extensions: ['html'], maxAge: config.env === 'production' ? '1h' : 0 }));
  // 混淆发布产物（构建后可通过 /release/ 直接访问）
  app.use('/release', express.static(config.distDir));

  // 业务 API
  app.use('/api', routes);
  app.use('/api', notFound); // 未命中的 /api 一律 404 JSON

  // SPA 兜底：非 /api 的 GET 未命中静态资源时回首页
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(config.publicDir, 'index.html'), err => (err ? next(err) : undefined));
  });

  app.use(errorHandler);
  return app;
}

module.exports = createApp;
