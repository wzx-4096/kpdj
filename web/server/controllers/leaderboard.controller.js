// ============ 排行榜接口控制器 ============
const leaderboardService = require('../services/leaderboard.service');

// GET /api/leaderboard?mode=&limit= → 排行列表
exports.list = (req, res, next) => {
  try {
    res.json({ data: leaderboardService.list(req.query) });
  } catch (e) { next(e); }
};

// POST /api/leaderboard  { pid, name, mode, levelId, stars, score } → 提交成绩
exports.submit = (req, res, next) => {
  try {
    res.status(201).json({ data: leaderboardService.submit(req.body) });
  } catch (e) { next(e); }
};
