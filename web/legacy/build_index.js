const fs=require('fs'),cp=require('child_process');
const src=fs.readFileSync('d:/ZMD/kpdj/13.html','utf8');
function rep(h,from,to){ const c=h.split(from).length-1; if(c!==1) throw new Error('patch expect 1 got '+c+' :: '+from.slice(0,60)); return h.replace(from,to); }
let h=src;
// 1) 默认隐藏真实名字：默认开，开发者选项里可关（存'0'关，存'1'开）
h=rep(h,'let hideNames=false;','let hideNames=true;');
h=rep(h,"let hn='0'; try{ hn=localStorage.getItem('hideNames')||'0'; }catch(e){}","let hn='1'; try{ hn=localStorage.getItem('hideNames')||'1'; }catch(e){}");
h=rep(h,"hideNames=(hn==='1')&&unlocked;","hideNames=hn!=='0';");
// 2) 抽出主脚本（JS 里的真名保留，混淆后自动加密；运行时开关可还原）
const m=[...h.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
if(!m.length) throw new Error('no inline script');
m.sort((a,b)=>b[1].length-a[1].length);
const big=m[0];
fs.writeFileSync('d:/ZMD/kpdj/_src.js',big[1]);
// 3) 商业混淆（保持60fps性能：不做控制流平铺，字符串数组base64加密）
cp.execSync('npx -y javascript-obfuscator d:/ZMD/kpdj/_src.js --output d:/ZMD/kpdj/_obf.js --compact true --control-flow-flattening false --dead-code-injection false --string-array true --string-array-encoding base64 --string-array-threshold 1 --string-array-rotate true --string-array-shuffle true --identifier-names-generator hexadecimal --rename-globals false --self-defending true --numbers-to-expressions true --simplify true --transform-object-keys false',{stdio:'inherit'});
const obf=fs.readFileSync('d:/ZMD/kpdj/_obf.js','utf8');
// 4) HTML 静态部分烘焙代号（明文真名+13班字样不出现在发布源码里）
const NAME_MAP={ '王艳':'飞腿教官','李嘉泽':'呼噜睡侠','李晨雨':'音波使','朱皓宇':'豪掷公子','丁晓华':'时停程序员','任秋红':'唤灵导师','程梓鑫':'弹弹肉饼','赵丽娜':'绿叶射手','刘一鸣':'米花本尊','刘二鸣':'米花分身·贰','刘三鸣':'米花分身·叁','刘焜':'干饭狂战' };
let head=h.slice(0,big.index), tail=h.slice(big.index+big[0].length);
for(const [real,alias] of Object.entries(NAME_MAP)){ head=head.split(real).join(alias); tail=tail.split(real).join(alias); }
head=head.replace('<title>初13班卡牌对决</title>','<title>卡牌对决</title>').replace('>🃏 初13班<','>🃏 卡牌对决<').replace('>13班卡牌对决<','>卡牌对决<');
// 5) 回填 + HTML压缩（去注释/缩进/空行）
let html=head+'<script>'+obf+'</script>'+tail;
html=html.replace(/<!--[\s\S]*?-->/g,'');
html=html.replace(/^[ \t]+/gm,'').replace(/\n{2,}/g,'\n');
fs.writeFileSync('d:/ZMD/kpdj/index.html',html);
console.log('BUILD OK, index.html size =',html.length);
