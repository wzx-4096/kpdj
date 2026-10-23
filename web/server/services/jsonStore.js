// ============ JSON 文件存储 ============
// 极简持久化：整份 JSON 读入内存 → 修改 → 写临时文件 → rename 原子替换。
// 单进程小数据量场景足够，避免引入数据库原生依赖。
const fs = require('fs');
const path = require('path');

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

// @param {string} filePath 数据文件绝对路径
// @param {*} defaultValue 文件不存在时的默认结构
function createStore(filePath, defaultValue) {
  const dir = path.dirname(filePath);

  function read() {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      if (e.code !== 'ENOENT') console.warn('[jsonStore] 读取失败，回退默认值：', filePath, e.message);
      return clone(defaultValue);
    }
  }

  function write(data) {
    fs.mkdirSync(dir, { recursive: true });
    const tmp = filePath + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, filePath); // 同目录 rename 为原子操作
    return data;
  }

  return { read, write, filePath };
}

module.exports = { createStore };
