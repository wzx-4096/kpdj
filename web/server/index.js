// ============ 服务启动入口 ============
const createApp = require('./app');
const config = require('./config');

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`\n🎴  ${config.name} v${config.version}  [${config.env}]`);
  console.log(`    本地访问：http://localhost:${config.port}`);
  console.log(`    健康检查：http://localhost:${config.port}/api/health\n`);
});

// 优雅退出（Ctrl+C / 进程终止信号）
['SIGINT', 'SIGTERM'].forEach(sig => {
  process.on(sig, () => {
    console.log(`\n[${sig}] 正在关闭服务…`);
    server.close(() => process.exit(0));
  });
});
