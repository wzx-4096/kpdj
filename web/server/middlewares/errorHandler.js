// ============ 统一错误处理 ============
// 业务错误（带 status）原样透出；未预期错误统一 500 且不泄露堆栈给客户端。
module.exports = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('[error]', req.method, req.originalUrl, err);

  res.status(status).json({
    error: {
      code: err.code || (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
      message: status >= 500 ? '服务器内部错误' : err.message
    }
  });
};
