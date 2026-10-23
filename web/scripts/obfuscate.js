// ============ 混淆发布构建 ============
// 由 public/{index.html, css/style.css, js/game.js} 生成自包含单文件 dist/index.html。
// 流程：JS 三处补丁 → 商业混淆 → HTML/CSS 静态部分烘焙代号（真名/「13班」不出现在发布源码）
//       → 内联回填 → 压缩。
// 沿用旧 build_index.js 的混淆参数，刻意不开控制流平铺（控制流平铺会显著拖慢主循环，影响 60fps）。
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PUB = path.join(ROOT, 'public');
const DIST = path.join(ROOT, 'dist');

const LINK_TAG = '<link rel="stylesheet" href="./css/style.css">';
const SCRIPT_TAG = '<script src="./js/game.js"></script>';

// 补丁：必须精确命中 1 次，否则报错（防止源码改动后静默失效）
function rep(s, from, to) {
  const count = s.split(from).length - 1;
  if (count !== 1) throw new Error('patch expect 1 got ' + count + ' :: ' + from.slice(0, 60));
  return s.replace(from, to);
}

// 真名 → 代号（发布源码中不出现明文真名）
const NAME_MAP = {
  '王艳': '飞腿教官', '李嘉泽': '呼噜睡侠', '李晨雨': '音波使', '朱皓宇': '豪掷公子',
  '丁晓华': '时停程序员', '任秋红': '唤灵导师', '程梓鑫': '弹弹肉饼', '赵丽娜': '绿叶射手',
  '刘一鸣': '米花本尊', '刘二鸣': '米花分身·贰', '刘三鸣': '米花分身·叁', '刘焜': '干饭狂战'
};

function main() {
  const html = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(PUB, 'css', 'style.css'), 'utf8');
  let js = fs.readFileSync(path.join(PUB, 'js', 'game.js'), 'utf8');

  // 1) 默认隐藏真实名字已在 public/js/game.js 源码里生效（hideNames 默认 true、localStorage 默认 '1'、
  //    hideNames=hn!=='0'），此处不再需要打补丁，避免源码改动后 rep() 静默失配。

  // 2) JS 商业混淆（字符串数组 base64 + 十六进制标识符 + selfDefending）
  const tmpSrc = path.join(ROOT, '.tmp_src.js');
  const tmpObf = path.join(ROOT, '.tmp_obf.js');
  fs.writeFileSync(tmpSrc, js, 'utf8');
  try {
    cp.execSync(
      `npx -y javascript-obfuscator "${tmpSrc}" --output "${tmpObf}" ` +
      '--compact true --control-flow-flattening false --dead-code-injection false ' +
      '--string-array true --string-array-encoding base64 --string-array-threshold 1 ' +
      '--string-array-rotate true --string-array-shuffle true ' +
      '--identifier-names-generator hexadecimal --rename-globals false ' +
      '--self-defending true --numbers-to-expressions true --simplify true --transform-object-keys false',
      { stdio: 'inherit' }
    );
  } finally {
    try { fs.unlinkSync(tmpSrc); } catch (e) { /* 忽略 */ }
  }
  const obf = fs.readFileSync(tmpObf, 'utf8');
  try { fs.unlinkSync(tmpObf); } catch (e) { /* 忽略 */ }

  // 3) 拆出 HTML 结构（避开 JS，仅对静态部分烘焙，防止破坏字符串数组）
  const lines = html.split(/\r?\n/);
  const iLink = lines.findIndex(l => l.includes(LINK_TAG));
  const iScript = lines.findIndex(l => l.includes(SCRIPT_TAG));
  if (iLink < 0 || iScript < 0 || iScript < iLink) throw new Error('缺少 link/script 占位标签，无法构建');

  const head = lines.slice(0, iLink).join('\n');          // <!DOCTYPE … <title>
  const shell = lines.slice(iLink + 1, iScript).join('\n'); // </head> <body> … 正文
  const tail = lines.slice(iScript + 1).join('\n');        // </body> </html>

  // 4) 静态部分烘焙代号 + 「13班」→「卡牌对决」（仅作用于 HTML/CSS，避开已混淆的 JS）
  const bake = s => {
    let out = s;
    for (const [real, alias] of Object.entries(NAME_MAP)) out = out.split(real).join(alias);
    return out
      .replace('<title>初13班卡牌对决</title>', '<title>卡牌对决</title>')
      .replace('>🃏 初13班<', '>🃏 卡牌对决<')
      .replace('>13班卡牌对决<', '>卡牌对决<');
  };
  const headB = bake(head);
  const cssB = bake(css);
  const shellB = bake(shell);
  const tailB = bake(tail);

  // 5) 内联回填 + 压缩（去 HTML 注释 / 行首缩进 / 连续空行）
  let out = headB + '\n<style>\n' + cssB + '\n</style>\n' + shellB + '\n<script>\n' + obf + '\n</script>\n' + tailB + '\n';
  out = out.replace(/<!--[\s\S]*?-->/g, '').replace(/^[ \t]+/gm, '').replace(/\n{2,}/g, '\n');

  fs.mkdirSync(DIST, { recursive: true });
  const outFile = path.join(DIST, 'index.html');
  fs.writeFileSync(outFile, out, 'utf8');
  console.log('BUILD OK →', outFile, '=', out.length, 'chars');

  // 6) 同步 public/images 到 dist/images（隐藏彩蛋图片 ./images/01.* 在单文件版也要能显示）
  const imgSrc = path.join(PUB, 'images');
  if (fs.existsSync(imgSrc)) {
    const files = fs.readdirSync(imgSrc).filter(f => f !== '.gitkeep');
    if (files.length) {
      const imgDst = path.join(DIST, 'images');
      fs.mkdirSync(imgDst, { recursive: true });
      for (const f of files) fs.copyFileSync(path.join(imgSrc, f), path.join(imgDst, f));
      console.log('COPY images →', imgDst, '=', files.join(', '));
    }
  }

  // 7) 管理员页面作为独立静态文件一起发布（/MTC.html）
  const mtcSrc = path.join(PUB, 'MTC.html');
  if (fs.existsSync(mtcSrc)) {
    fs.copyFileSync(mtcSrc, path.join(DIST, 'MTC.html'));
    console.log('COPY MTC.html →', path.join(DIST, 'MTC.html'));
  }
}

main();
