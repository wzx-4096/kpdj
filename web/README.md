# 13班卡牌对决 · 网页版

标准 Node.js + Express 前后端工程。前端是单页卡牌对战游戏，后端提供存档与排行榜接口。

## 目录结构

```
web/
├─ package.json
├─ .env.example          # 环境变量示例（复制为 .env）
├─ server/               # 后端
│  ├─ index.js           # 启动入口
│  ├─ app.js             # Express 装配（中间件 / 路由 / 静态 / 兜底 / 错误）
│  ├─ config/index.js    # 端口、路径、环境变量
│  ├─ routes/            # 路由：index / health / players / leaderboard
│  ├─ controllers/       # 控制器：player / leaderboard
│  ├─ services/          # 业务与存储：jsonStore / player / leaderboard
│  ├─ middlewares/       # notFound / errorHandler
│  └─ data/              # 运行时数据（players.json、leaderboard.json，自动生成）
├─ public/               # 前端（源码，Express 静态托管）
│  ├─ index.html         # 仅结构
│  ├─ css/style.css
│  ├─ js/game.js         # 单个 IIFE，全部游戏逻辑
│  ├─ images/            # 预留：图片
│  ├─ videos/            # 预留：视频
│  └─ audio/             # 预留：音频
├─ scripts/obfuscate.js  # 混淆发布构建 → dist/index.html
├─ dist/                 # 混淆发布产物（对外分发）
└─ legacy/               # 旧单文件版本归档（回滚参照）
```

## 安装与启动

```bash
cd web
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm start                 # 或 npm run dev（--watch 热重启）
```

浏览器打开 <http://localhost:3000>。

也可直接双击 `public/index.html` 以 `file://` 方式打开（CSS/JS 用相对路径引用，两种方式均可运行）。

## 构建发布版

```bash
npm run build             # 产出 dist/index.html（自包含单文件）
```

构建做的事：对 `js/game.js` 施加「默认隐藏真名」三处补丁 → 商业混淆（字符串数组 base64、十六进制标识符、selfDefending，刻意不开控制流平铺以保 60fps）→ 把 `index.html` / `style.css` 的静态文本烘焙为代号（12 个真名 + 3 处「13班」）→ 内联回填并压缩。

产物 `dist/index.html` 同时可通过 `http://localhost:3000/release/` 访问。

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 `{ok, name, version, env, uptime}` |
| POST | `/api/players` | `{name}` → 按名字建/取玩家 |
| GET | `/api/players/:pid` | 玩家资料 + 存档 |
| PUT | `/api/players/:pid/progress` | `{progress}` → 保存存档（浅合并，体积上限 32KB） |
| GET | `/api/leaderboard?mode=&limit=` | 排行榜（score 降序，limit 默认 50 / 上限 200；`mode` 留空返回跨模式的全局榜） |
| POST | `/api/leaderboard` | `{pid,name,mode,levelId,stars,score}` → 提交成绩（同玩家同模式保留最高分） |

示例：

```bash
curl http://localhost:3000/api/health

curl -X POST http://localhost:3000/api/players \
  -H "Content-Type: application/json" -d '{"name":"小明"}'

curl -X PUT http://localhost:3000/api/players/<pid>/progress \
  -H "Content-Type: application/json" -d '{"progress":{"storyClear":2}}'

curl -X POST http://localhost:3000/api/leaderboard \
  -H "Content-Type: application/json" \
  -d '{"pid":"<pid>","mode":"story","levelId":"1","stars":5,"score":500}'

curl "http://localhost:3000/api/leaderboard?mode=story&limit=10"
```

非法入参统一返回 `400`，错误结构为 `{error:{code,message}}`。

> 说明：前端目前**不调用**后端接口，后端可独立使用（用 curl 验证）。后续接入只需在 `public/js/game.js` 中加 `fetch` 调用。

## 数据存储

`server/data/` 下的 JSON 文件，首次写入自动创建。落盘采用「写临时文件 + rename」原子替换，避免写入中断导致文件损坏。该目录已在 `.gitignore` 中忽略。
