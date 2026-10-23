// ============ 玩家接口控制器 ============
const playerService = require('../services/player.service');

// POST /api/players  { name } → 建/取玩家
exports.createOrGet = (req, res, next) => {
  try {
    res.status(200).json({ data: playerService.getOrCreate(req.body && req.body.name) });
  } catch (e) { next(e); }
};

// GET /api/players/:pid → 玩家资料 + 进度
exports.getOne = (req, res, next) => {
  try {
    const player = playerService.get(req.params.pid);
    if (!player) {
      const err = new Error('玩家不存在');
      err.status = 404;
      err.code = 'PLAYER_NOT_FOUND';
      return next(err);
    }
    res.json({ data: player });
  } catch (e) { next(e); }
};

// PUT /api/players/:pid/progress  { progress } → 保存存档
exports.saveProgress = (req, res, next) => {
  try {
    res.json({ data: playerService.saveProgress(req.params.pid, req.body && req.body.progress) });
  } catch (e) { next(e); }
};
