// ============ 404 兜底 ============
// 走到这里说明前面所有路由（含 SPA 兜底）都未命中。
module.exports = (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: '接口不存在：' + req.method + ' ' + req.path } });
  }
  res.status(404).json({ error: { code: 'NOT_FOUND', message: '资源不存在' } });
};
