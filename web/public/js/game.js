    (function() {
        // ============ 音效 ============
        let audioCtx=null;
        function initAudio(){ if(!audioCtx) try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){audioCtx=null;} if(audioCtx&&audioCtx.state==='suspended') audioCtx.resume(); }
        function playSound(freq,type,duration,vol=0.12,glide=null){ if(!audioCtx) return; try{ const t=audioCtx.currentTime; const o=audioCtx.createOscillator(); const g=audioCtx.createGain(); o.type=type; o.frequency.setValueAtTime(freq,t); if(glide) o.frequency.linearRampToValueAtTime(glide,t+duration); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+duration); o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t+duration); }catch(e){} }
        function sfxShoot(){ playSound(300,'square',0.12,0.06,600); }
        function sfxHit(){ playSound(60,'sawtooth',0.18,0.08); }
        function sfxHeal(){ playSound(500,'sine',0.12,0.1,700); }
        function sfxDodge(){ playSound(600,'sine',0.1,0.1,800); }
        function sfxDraw(){ playSound(500,'square',0.1,0.06,900); }
        function sfxWin(){ playSound(400,'square',0.12,0.08,800); setTimeout(()=>playSound(500,'square',0.12,0.08,1000),100); }
        function sfxBounce(){ playSound(200,'triangle',0.05,0.03,350); }
        function sfxClick(){ playSound(800,'sine',0.04,0.02); }
        function sfxSonic(){ playSound(150,'sine',0.18,0.2,80); }
        function sfxFreeze(){ playSound(80,'sawtooth',0.2,0.15); }
        function sfxSummon(){ playSound(500,'sine',0.15,0.15,700); }
        function sfxRevive(){ playSound(400,'sine',0.2,0.3,600); }
        function sfxSlam(){ playSound(150,'triangle',0.12,0.3,60); }
        function sfxPhone(){ playSound(1150,'square',0.08,0.12,1500); setTimeout(()=>playSound(1150,'square',0.08,0.12,1500),110); setTimeout(()=>playSound(1450,'square',0.1,0.12,1900),220); }
        function sfxSmoke(){ playSound(70,'sawtooth',0.3,0.25,140); }

        // ============ 背景音乐（WebAudio 合成，每个模式一首循环曲） ============
        let bgmName='', bgmTimer=null, bgmStep=0, bgmNext=0, bgmOut=null, bgmNoise=null, bgmWish=null, musicOn=false;
        function bgmFreq(s){ if(!s||s==='.') return 0; const m=/^([A-G]#?)(-?\d)$/.exec(s); const NF={C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11}; return m?440*Math.pow(2,(NF[m[1]]+12*(+m[2]+1)-69)/12):0; }
        function bgmVoice(f,t,d,type,vol,to){ if(!f||!bgmOut) return; try{ const o=audioCtx.createOscillator(), g=audioCtx.createGain(); o.type=type; o.frequency.setValueAtTime(f,t); if(to) o.frequency.exponentialRampToValueAtTime(to,t+d*0.9); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+d); o.connect(g); g.connect(bgmOut); o.start(t); o.stop(t+d+0.03); }catch(e){} }
        function bgmNoiseHit(t,vol,hz){ if(!bgmOut) return; try{ if(!bgmNoise){ const n=Math.max(1,(audioCtx.sampleRate*0.06)|0), b=audioCtx.createBuffer(1,n,audioCtx.sampleRate), d=b.getChannelData(0); for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n); bgmNoise=b; } const s=audioCtx.createBufferSource(), f=audioCtx.createBiquadFilter(), g=audioCtx.createGain(); s.buffer=bgmNoise; f.type='highpass'; f.frequency.value=hz; g.gain.value=vol; s.connect(f); f.connect(g); g.connect(bgmOut); s.start(t); s.stop(t+0.06); }catch(e){} }
        // 曲库：每首曲子=若干段落(parts)按编排(arr)串成完整乐句，arr 里 [段号,移调半音] 可让段落重复时升调；
        // ch=和弦进行（每段按和弦自动生成琶音层与垫音层），lead=主旋律 bass=低音 drum=k鼓 h镲 s军鼓，'.'=休止，每步=八分音符
        const BGM={
            menu:{ bpm:96, w:'triangle', v:1.0, chOct:3, arp:0.05, pad:0.04,
                arr:[[0,0],[1,0],[2,0],[3,0],[1,2],[2,2]],
                parts:[
                    { ch:'C G Am F', lead:'E5 . G5 . D5 . B4 . C5 . E5 . A4 . C5 .', bass:'C3 . . C3 G2 . . G2 A2 . . A2 F2 . . F2', drum:'h . . . h . . . h . . . h . . .' },
                    { ch:'F G C Am', lead:'A4 . C5 . B4 . D5 . C5 . E5 . D5 . B4 .', bass:'F2 . . F2 G2 . . G2 C3 . . C3 A2 . . A2', drum:'h . . . h . . k h . . . h . . .' },
                    { ch:'Am F C G', lead:'C5 . E5 . F5 . E5 . D5 . C5 . B4 . G4 .', bass:'A2 . . A2 F2 . . F2 C3 . . C3 G2 . . G2', drum:'h . k . h . k . h . k . h . k .' },
                    { ch:'F G C C', lead:'A4 . B4 . C5 . . . G4 . A4 . . . . .', bass:'F2 . . F2 G2 . . G2 C3 . . . C3 . . .', drum:'h . . . h . . . h . . . h . . .' }
                ] },
            select:{ bpm:118, w:'square', v:0.85, chOct:3, arp:0.045,
                arr:[[0,0],[1,0],[2,0],[3,0],[2,0],[3,0]],
                parts:[
                    { ch:'C G Am F', lead:'C5 . E5 G5 E5 . D5 . C5 . D5 E5 D5 . C5 .', bass:'C3 . . . G2 . . . A2 . . . F2 . . .', drum:'k . h . k . h . k . h . k . h .' },
                    { ch:'F G C C', lead:'F5 . E5 . D5 . C5 . D5 . E5 . C5 . . .', bass:'F2 . . . G2 . . . C3 . . . C3 . . .', drum:'k . h . k . h . k . h . k h h .' },
                    { ch:'Am F G C', lead:'A4 . C5 . E5 . D5 . C5 . B4 . A4 . G4 .', bass:'A2 . . . F2 . . . G2 . . . C3 . . .', drum:'k . h k s . h . k . h . k . h .' },
                    { ch:'F G C G', lead:'F5 . G5 . A5 . G5 . E5 . D5 . C5 . . .', bass:'F2 . . . G2 . . . C3 . . . G2 . . .', drum:'k . h . k . h . k h h . s . k .' }
                ] },
            battle:{ bpm:134, w:'sawtooth', v:0.8, chOct:3, arp:0.04,
                arr:[[0,0],[1,0],[2,0],[3,0],[1,0],[2,0],[3,0]],
                parts:[
                    { ch:'Am F G Am', lead:'A4 . C5 . E5 . D5 . C5 . B4 . A4 . G4 .', bass:'A2 A2 . A2 A2 . F2 . G2 G2 . G2 A2 . A2 .', drum:'k . h k s . h k k . h k s . h .' },
                    { ch:'Dm G C Am', lead:'D5 . D5 . F5 . E5 . D5 . C5 . B4 . A4 .', bass:'D2 D2 . D2 G2 . G2 . C3 C3 . C3 A2 . A2 .', drum:'k . h k s . h k k h h k s . h k' },
                    { ch:'Am F Dm E7', lead:'A4 A4 C5 C5 D5 . F5 . E5 . D5 . C5 . B4 .', bass:'A2 . A2 . F2 . F2 . D2 . D2 . E2 . E2 .', drum:'k h k h s h k h k h k h s h k s' },
                    { ch:'Am G F E7', lead:'A4 . G4 . F4 . E4 . A4 . B4 . C5 . . .', bass:'A2 . . A2 G2 . . G2 F2 . . F2 E2 . E2 .', drum:'k . h . s . k s k . h . s s k .' }
                ] },
            manual:{ bpm:150, w:'square', v:0.78, chOct:3, arp:0.04,
                arr:[[0,0],[1,0],[2,0],[3,0],[0,0],[2,0],[3,0]],
                parts:[
                    { ch:'Em C G D', lead:'E5 E5 G5 A5 . G5 E5 . D5 D5 F5 G5 . F5 D5 .', bass:'E2 E2 . E2 C3 . C3 . G2 G2 . G2 D3 . D3 .', drum:'k h h k s h k h k h h k s h k s' },
                    { ch:'Am F C G', lead:'A4 . C5 . E5 E5 D5 C5 B4 . D5 . G4 . B4 .', bass:'A2 A2 . A2 F2 . F2 . C3 C3 . C3 G2 . G2 .', drum:'s h k h s h k h s h k h s h k s' },
                    { ch:'Em C Am B7', lead:'E5 . E5 G5 A5 . B5 . A5 . G5 . E5 . D5 .', bass:'E2 . E2 . C3 . C3 . A2 . A2 . B2 . B2 .', drum:'k h k h k h k h s h s h k h k h' },
                    { ch:'Em D C B7', lead:'E5 D5 C5 D5 E5 . G5 . A5 G5 F5 G5 E5 . . .', bass:'E2 . E2 . D2 . D2 . C3 . C3 . B2 . B2 .', drum:'k h k h k h k s s h k h k s s s' }
                ] },
            duel:{ bpm:140, w:'sawtooth', v:0.85, chOct:3, arp:0.045,
                arr:[[0,0],[1,0],[2,0],[3,0],[2,0],[3,0]],
                parts:[
                    { ch:'Dm A# C Dm', lead:'D5 . . D5 . F5 . E5 . D5 . . A4 . C5 .', bass:'D2 D2 . D2 A#1 . A#1 . C2 C2 . C2 D2 . D2 .', drum:'k . k h s . k . k . k h s . k .' },
                    { ch:'Dm Gm A A', lead:'D5 D5 F5 . G5 . F5 . E5 . D5 . A4 . C5 .', bass:'D2 . . D2 G2 . G2 . A1 . A1 . A1 . A1 .', drum:'k . k h s . k h k . k h s . k s' },
                    { ch:'Dm A# Gm A', lead:'D5 . F5 . A5 . G5 . F5 . E5 . D5 . C5 .', bass:'D2 . . D2 A#1 . A#1 . G1 . G1 . A1 . A1 .', drum:'k h k h s . k h k h k h s . k .' },
                    { ch:'Dm C A# A', lead:'D5 . C5 . A#4 . A4 . D5 . E5 . F5 . . .', bass:'D2 . . D2 C2 . C2 . A#1 . A#1 . A1 . A1 .', drum:'k . k . s s k . k . k . s s k s' }
                ] },
            story:{ bpm:72, w:'sine', v:1.0, chOct:3, arp:0.055, pad:0.05, arpDir:'down',
                arr:[[0,0],[1,0],[2,0],[3,0],[1,0],[2,0]],
                parts:[
                    { ch:'C Am F G', lead:'C5 . . E5 . G4 . . A4 . . C5 . . B4 .', bass:'C3 . . . A2 . . . F2 . . . G2 . . .', drum:'h . . . . . . . h . . . . . . .' },
                    { ch:'Am F C G', lead:'A4 . . C5 . E5 . . D5 . . C5 . . B4 .', bass:'A2 . . . F2 . . . C3 . . . G2 . . .', drum:'h . . . . . . . h . . . . . . .' },
                    { ch:'F G C Am', lead:'F4 . . A4 . C5 . . B4 . . D5 . . C5 .', bass:'F2 . . . G2 . . . C3 . . . A2 . . .', drum:'h . . . . . . . k . . . . . . .' },
                    { ch:'F G C C', lead:'A4 . B4 . C5 . . . C5 . . . . . . .', bass:'F2 . . . G2 . . . C3 . . . C3 . . .', drum:'h . . . . . . . h . . . . . . .' }
                ] },
            map:{ bpm:112, w:'square', v:0.8, chOct:3, arp:0.045,
                arr:[[0,0],[1,0],[2,0],[3,0],[1,0],[2,0],[3,0]],
                parts:[
                    { ch:'C G Am F', lead:'C5 D5 E5 G5 E5 D5 C5 D5 E5 F5 G5 A5 G5 F5 E5 D5', bass:'C3 . G2 . A2 . E2 . F2 . C3 . G2 . G2 .', drum:'k . h . k . h . k . h . k h h .' },
                    { ch:'F C G G', lead:'F5 . E5 D5 C5 . D5 E5 F5 . G5 . E5 . C5 .', bass:'F2 . . F2 C3 . C3 . G2 . . G2 G2 . G2 .', drum:'k . h . k . h . k h k h s . h .' },
                    { ch:'Am G F C', lead:'A4 . C5 E5 . D5 C5 . B4 . D5 F5 . E5 D5 .', bass:'A2 . . A2 G2 . G2 . F2 . . F2 C3 . C3 .', drum:'k . h k s . h . k . h . k h h .' },
                    { ch:'F G C G', lead:'F5 G5 A5 G5 F5 E5 D5 E5 F5 . G5 . C6 . . .', bass:'F2 . . F2 G2 . . G2 C3 . . C3 G2 . G2 .', drum:'k . h . k . h . k h h k s . h s' }
                ] },
            vs:{ bpm:152, w:'sawtooth', v:0.85, chOct:3, arp:0.05,
                arr:[[0,0],[1,0]],
                parts:[
                    { ch:'Am Am E E', lead:'A4 A4 C5 C5 E5 E5 A5 . G5 G5 E5 E5 C5 C5 A4 .', bass:'A2 . A2 . A2 . A2 . E2 . E2 . E2 . E2 .', drum:'k k k s k k k s k k k s k k s s' },
                    { ch:'Am F E Am', lead:'A5 . G5 . F5 . E5 . E5 . D5 . C5 . B4 .', bass:'A2 . A2 . F2 . F2 . E2 . E2 . A2 . A2 .', drum:'k s k s k s k k s k s k s k s s' }
                ] },
            victory:{ bpm:126, w:'square', v:0.95, chOct:3, arp:0.05, pad:0.04,
                arr:[[0,0],[1,0],[2,0],[3,0],[2,2],[3,2]],
                parts:[
                    { ch:'C F G C', lead:'C5 E5 G5 C6 . G5 C6 . E6 . C6 . G5 C6 . .', bass:'C3 . C3 . F2 . F2 . G2 . G2 . C3 . C3 .', drum:'k . h . k . h . k . h . k s k .' },
                    { ch:'C Am F G', lead:'E5 . G5 . C6 . B5 . A5 . G5 . F5 . E5 .', bass:'C3 . . C3 A2 . A2 . F2 . F2 . G2 . G2 .', drum:'k . h k s . h . k . h . k s k .' },
                    { ch:'F G C Am', lead:'F5 . G5 . A5 . G5 . C6 . B5 . A5 . G5 .', bass:'F2 . . F2 G2 . G2 . C3 . . C3 A2 . A2 .', drum:'k . h k s . h k k h h k s . h .' },
                    { ch:'F G C C', lead:'C6 . . . G5 . C6 . . . . . . . . .', bass:'F2 . . F2 G2 . . G2 C3 . . . C3 . . .', drum:'k . h . k . h . k s k . s s k s' }
                ] },
            lose:{ bpm:82, w:'triangle', v:0.85, chOct:3, arp:0.05, pad:0.045, arpDir:'down',
                arr:[[0,0],[1,0],[2,0],[1,0]],
                parts:[
                    { ch:'Am F Dm E', lead:'A4 . G4 . F4 . E4 . D4 . . . C4 . . .', bass:'A2 . . . F2 . . . D2 . . . E2 . . .', drum:'. . . . . . . . . . . . . . . .' },
                    { ch:'Am Dm E Am', lead:'A4 . . G4 . F4 . . E4 . D4 . C4 . . .', bass:'A2 . . A2 D2 . D2 . E2 . E2 . A2 . . .', drum:'. . . . . . . . . . . . . . . .' },
                    { ch:'Dm Am E E', lead:'D4 . F4 . A4 . G4 . E4 . . . A4 . . .', bass:'D2 . . . A2 . . . E2 . E2 . E2 . . .', drum:'. . . . . . . . . . . . . . . .' }
                ] }
        };
        function bgmBuild(tr){   // 把段落按编排展开成一条完整乐句（含和弦自动配的琶音层/垫音层）
            if(tr._f) return tr._f;
            const NM={C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11};
            const Q={'':[0,4,7],m:[0,3,7],7:[0,4,7,10],m7:[0,3,7,10],maj7:[0,4,7,11],sus4:[0,5,7],dim:[0,3,6]};
            const hz=(n,o)=>440*Math.pow(2,(NM[n]+12*(o+1)-69)/12);
            const chz=(nm,o)=>{ const m=/^([A-G]#?)(maj7|sus4|m7|dim|m|7|)$/.exec(nm), r=m?hz(m[1],o):hz('C',o); return (Q[m&&m[2]?m[2]:'']||Q['']).map(s=>r*Math.pow(2,s/12)); };
            const SP=v=>typeof v==='string'?v.split(' '):v;
            const f={lead:[],bass:[],arp:[],drum:[],pad:[],padLen:[]};
            (tr.arr||tr.parts.map((p,i)=>[i,0])).forEach(a=>{
                const p=tr.parts[a[0]%tr.parts.length]; if(!p) return;
                const sh=Math.pow(2,(a[1]||0)/12), n=16, L=SP(p.lead), B=SP(p.bass), D=p.drum?SP(p.drum):null;
                const chs=String(p.ch||'C').split(' '), seg=Math.max(1,(n/chs.length)|0), cfs=chs.map(c=>chz(c,tr.chOct||3));
                for(let i=0;i<n;i++){
                    f.lead.push(bgmFreq(L[i%L.length])*sh);
                    f.bass.push(bgmFreq(B[i%B.length])*sh);
                    const cc=cfs[((i/seg)|0)%cfs.length], t=cc.concat([cc[0]*2]);
                    f.arp.push(tr.arp?t[tr.arpDir==='down'?(t.length-1-i%t.length):i%t.length]*sh:0);
                    f.drum.push(D?D[i%D.length]:'.');
                    f.pad.push(tr.pad&&i%seg===0?[cc[0]*sh,(cc[2]||cc[1])*sh]:null);
                    f.padLen.push(seg);
                }
            });
            f.n=f.lead.length; tr._f=f; return f;
        }
        function bgmTick(){
            if(!audioCtx||!musicOn||!bgmName||audioCtx.state!=='running') return;
            const tr=BGM[bgmName]; if(!tr) return;
            const f=bgmBuild(tr), spb=60/tr.bpm/2, now=audioCtx.currentTime, v=tr.v;
            if(bgmNext<now) bgmNext=now+0.05;
            while(bgmNext<now+0.3){
                const j=bgmStep%f.n, acc=(j%4===0?1.15:0.9), pd=f.pad[j], D=f.drum[j];
                bgmVoice(f.lead[j],bgmNext,spb*1.7,tr.w,0.075*v*acc);
                bgmVoice(f.bass[j],bgmNext,spb*1.9,'triangle',0.095*v);
                if(f.arp[j]) bgmVoice(f.arp[j],bgmNext,spb*0.85,tr.aw||'sine',tr.arp*v*acc);
                if(pd){ bgmVoice(pd[0],bgmNext,spb*f.padLen[j]*0.95,'sine',tr.pad*v); bgmVoice(pd[1],bgmNext,spb*f.padLen[j]*0.95,'sine',tr.pad*v*0.7); }
                if(D==='k') bgmVoice(150,bgmNext,0.15,'sine',0.15*v,46);
                else if(D==='h') bgmNoiseHit(bgmNext,0.04*v,7000);
                else if(D==='s'){ bgmNoiseHit(bgmNext,0.06*v,2400); bgmVoice(240,bgmNext,0.09,'triangle',0.055*v); }
                bgmStep++; bgmNext+=spb;
            }
        }
        function bgmStop(){ if(bgmTimer){ clearInterval(bgmTimer); bgmTimer=null; } }
        function bgmApply(){   // 依据开关（默认关闭）启动或停止
            if(!musicOn||!bgmName||!audioCtx){ bgmStop(); return; }
            if(bgmTimer) return;                      // 已在播放
            if(!bgmOut){ bgmOut=audioCtx.createGain(); bgmOut.gain.value=0.55; bgmOut.connect(audioCtx.destination); }
            bgmStep=0; bgmNext=audioCtx.currentTime+0.08;
            bgmTimer=setInterval(bgmTick,45);
        }
        function setBgm(name){
            if(name===bgmName && bgmTimer) return;    // 同曲不重头播放
            bgmName=name||''; bgmStep=0;
            bgmApply();
        }
        // 首次点击/按键解锁音频后，如果音乐开关是开着的就立刻响起
        ['pointerdown','keydown','touchstart'].forEach(ev=>window.addEventListener(ev,()=>{ initAudio(); if(!bgmTimer) bgmApply(); },{passive:true}));

        // ============ 角色数据 ============
        const ROLES = [
            { id:'wangyan', name:'王艳', avatar:'👩‍🏫', hp:300, color:'#ff6b8a', skillInterval:3000, skillType:'bouncing_leg', skillDamage:30, bounceLimit:3, secondType:'call_parents', secondInterval:30000, projectileColor:'#ffaa80', projectileSize:18, projectileSpeed:3.5, moveSpeed:1.2, size:32, desc:'弯折腿🦵3秒 叫家长👨' },
            { id:'lijiaze', name:'李嘉泽', avatar:'😴', hp:300, color:'#7dbfff', skillInterval:4000, skillType:'triple_z', skillDamage:15, bounceLimit:1, projectileColor:'#c8e0ff', projectileSize:14, projectileSpeed:3.2, moveSpeed:1.15, size:30, desc:'打鼾Z💤4秒 3发各15' },
            { id:'lichenyu', name:'李晨雨', avatar:'👧', hp:300, color:'#a679ff', skillInterval:5500, skillType:'sonic_wave', skillDamage:20, bounceLimit:0, projectileColor:'#ffffff', projectileSize:22, projectileSpeed:4.0, moveSpeed:1.1, size:32, desc:'声波〰️5.5秒 穿透伤20 半血死亡笔记📓' },
            { id:'zhuhaoyu', name:'朱皓宇', avatar:'👦', hp:300, color:'#f0c060', skillInterval:4500, skillType:'random_luxury', skillDamage:0, bounceLimit:0, projectileColor:'#ffd700', projectileSize:20, projectileSpeed:3.6, moveSpeed:1.1, size:30, desc:'随机🚗28/⌚20' },
            { id:'dingxiaohua', name:'丁晓华', avatar:'👩‍💻', hp:300, color:'#66ccff', skillInterval:7000, skillType:'freeze_computer', skillDamage:30, bounceLimit:0, projectileColor:'#00aaff', projectileSize:24, projectileSpeed:3.4, moveSpeed:1.15, size:32, desc:'电脑💻7秒 时停3秒' },
            { id:'renqiuhong', name:'任秋红', avatar:'👩‍🏫', hp:300, color:'#ff99cc', skillInterval:10000, skillType:'spawn_emperor', skillDamage:0, bounceLimit:0, projectileColor:'#ffd700', projectileSize:0, projectileSpeed:0, moveSpeed:1.0, size:30, desc:'召唤皇帝👑10秒 上限5' },
            { id:'chengxinxin', name:'程梓鑫', avatar:'🧑‍🍳', hp:300, color:'#f5a623', skillInterval:5000, skillType:'beef_cake', skillDamage:15, bounceLimit:5, projectileColor:'#d2691e', projectileSize:20, projectileSpeed:3.0, moveSpeed:1.1, size:30, desc:'牛肉饼🍔5秒 弹5次' },
            { id:'zhaolina', name:'赵丽娜', avatar:'👩‍🏫', hp:300, color:'#90ee90', skillInterval:1000, skillType:'spinach', skillDamage:5, bounceLimit:0, projectileColor:'#228b22', projectileSize:16, projectileSpeed:3.0, moveSpeed:1.0, size:30, desc:'菠菜🥬每秒1发 可复活', hasRevive: true },
            { id:'liuyiming', name:'刘一鸣', avatar:'🧑‍🎓', hp:300, color:'#ffb347', skillInterval:3000, skillType:'popcorn_chicken', skillDamage:15, bounceLimit:0, projectileColor:'#ff8c00', projectileSize:14, projectileSpeed:3.2, moveSpeed:1.1, size:30, desc:'鸡米花🍿3秒 伤15 分身', hasSpawn: true,
              spawnRoles: [
                  { id:'liuerming', name:'刘二鸣', avatar:'🧑‍🎓', hp:150, color:'#ffb347', skillInterval:3000, skillType:'popcorn_chicken', skillDamage:15, bounceLimit:0, projectileColor:'#ff8c00', projectileSize:14, projectileSpeed:3.2, moveSpeed:1.1, size:28, desc:'鸡米花🍿3秒 伤15' },
                  { id:'liusanming', name:'刘三鸣', avatar:'🧑‍🎓', hp:150, color:'#ffb347', skillInterval:3000, skillType:'popcorn_chicken', skillDamage:15, bounceLimit:0, projectileColor:'#ff8c00', projectileSize:14, projectileSpeed:3.2, moveSpeed:1.1, size:28, desc:'鸡米花🍿3秒 伤15' }
              ]
            },
            { id:'liukun', name:'刘焜', avatar:'😋', hp:400, color:'#ff8c5a', skillInterval:9999999, skillType:'melee', skillDamage:10, bounceLimit:0, projectileColor:'#ff8c5a', projectileSize:0, projectileSpeed:0, moveSpeed:1.0, size:40, desc:'干饭😋吃食物长大 碰10伤 10秒冲锋30伤' }
        ];

        const EMPEROR_ROLE = { id:'emperor', name:'皇帝', avatar:'👑', hp:30, color:'#ffd700', skillInterval:9999999, skillType:'melee', skillDamage:15, projectileColor:'#ffd700', projectileSize:0, projectileSpeed:0, moveSpeed:1.8, size:22, desc:'近战碰撞伤害15' };
        const PARENT_ROLES = [
            { id:'dad', name:'家长', avatar:'👨', hp:100, color:'#9a8a6a', skillInterval:9999999, skillType:'melee', skillDamage:10, projectileColor:'#ffffff', projectileSize:0, projectileSpeed:0, moveSpeed:1.1, size:30, desc:'家长随机弹跳，碰撞学生扣10' },
            { id:'mom', name:'家长', avatar:'👩', hp:100, color:'#b08a6a', skillInterval:9999999, skillType:'melee', skillDamage:10, projectileColor:'#ffffff', projectileSize:0, projectileSpeed:0, moveSpeed:1.1, size:30, desc:'家长随机弹跳，碰撞学生扣10' }
        ];
        // ============ 阵营（老师 / 学生，家长只攻击学生） ============
        const TEACHER_IDS=['wangyan','dingxiaohua','renqiuhong','zhaolina','emperor','dad','mom'];
        ROLES.forEach(r=>{ r.faction=TEACHER_IDS.includes(r.id)?'teacher':'student'; (r.spawnRoles||[]).forEach(s=>s.faction='student'); });
        EMPEROR_ROLE.faction='teacher'; PARENT_ROLES.forEach(r=>r.faction='teacher');

        // ============ 故事模式角色：浮琴（父亲·七匹狼） ============
        const FUQIN_ROLE={ id:'fuqin', name:'浮琴', avatar:'🤬', hp:300, color:'#e74c3c', skillInterval:3000, skillType:'belt', skillDamage:30, bounceLimit:0, projectileColor:'#8a5326', projectileSize:17, projectileSpeed:2.8, moveSpeed:1.15, size:30, desc:'七匹狼皮带', faction:'story' };

        // ============ 屏蔽真实名字（开发者选项）：角色代号 ============
        const ROLE_ALIASES={ wangyan:'飞腿教官', lijiaze:'呼噜睡侠', lichenyu:'音波使', zhuhaoyu:'豪掷公子', dingxiaohua:'时停程序员', renqiuhong:'唤灵导师', chengxinxin:'弹弹肉饼', zhaolina:'绿叶射手', liuyiming:'米花本尊', liuerming:'米花分身·贰', liusanming:'米花分身·叁', liukun:'干饭狂战' };
        // 真名表：HTML 静态文本在发布版里被烘焙成代号，关闭屏蔽时的还原只能靠真名（不能读 el.textContent）。
        // 这里由 ROLES 运行时填充，不在源码里再写一份真名，避免发布版多出真名明文残留。
        const ROLE_REAL={};
        ROLES.forEach(r=>{ if(ROLE_ALIASES[r.id]) ROLE_REAL[r.id]=r.name; (r.spawnRoles||[]).forEach(s=>{ if(ROLE_ALIASES[s.id]) ROLE_REAL[s.id]=s.name; }); });
        // 真名常量：屏蔽/还原"13班"字样（发布版里 HTML 文本被烘焙成代号，还原只能靠这里的常量）
        const CLS_REAL={'🃏 卡牌对决':'🃏 初13班','卡牌对决':'13班卡牌对决'};
        const TITLE_REAL='初13班卡牌对决';
        let hideNames=true;
        function rn(role){ return role && hideNames && ROLE_ALIASES[role.id] ? ROLE_ALIASES[role.id] : (role?role.name:''); }
        function syncHiddenNames(){
            document.querySelectorAll('[data-role]').forEach(el=>{
                const id=el.dataset.role;
                el.textContent=(hideNames&&ROLE_ALIASES[id])?ROLE_ALIASES[id]:(ROLE_REAL[id]||el.dataset.real||el.textContent);
            });
            document.querySelectorAll('[data-cls]').forEach(el=>{
                el.dataset.real=CLS_REAL[el.dataset.cls]||el.dataset.real||el.textContent;
                el.textContent=hideNames?el.dataset.cls:el.dataset.real;
            });
            document.title=hideNames?'卡牌对决':TITLE_REAL;
        }

        // ============ 隐藏角色（开发者选项）：默认隐藏 朱皓宇，可在开发者选项里开关 ============
        let zhHidden=true;
        function isRoleHidden(id){ return zhHidden && id==='zhuhaoyu'; }
        function visibleRoles(){ return ROLES.filter(r=>!isRoleHidden(r.id)); }
        function syncHiddenRoleUI(){
            let zh='1'; try{ zh=localStorage.getItem('hideZhu')||'1'; }catch(e){}
            zhHidden=zh!=='0';
            const zt=document.getElementById('btnHideZhuToggle'); if(zt) zt.classList.toggle('on',zhHidden);
            const rz=document.getElementById('ruleRoleZhu'); if(rz) rz.style.display=zhHidden?'none':'';
        }

        // ============ 全局状态 ============
        let gameMode=null, battleActive=false, animationId=null;
        let canvas, ctx, arenaSize=320, entities=[], projectiles=[], particles=[], smokes=[], foods=[], foodTimer=0;
        let isManualBattle=false, manualEnt=null, manualMyRole=null, manualEnemyRole=null, manualLaunched=false;
        const joyMove={x:0,y:0,active:false}, joySkill={x:0,y:0,active:false};
        let player1Role=null, player2Role=null, drawnCards={1:false,2:false};
        let freeSelected={p1:null,p2:null};
        let brSelectedRoles=[];
        let hudSignature='', uidCounter=0, drawSession=0;

        // ============ 界面导航 ============
        function showScreen(s){
            ['screenMenu','screenMode','screenManualSelect','screenFreeSelect','screenDualDraw','screenVS','screenBattle','screenBRSelect','screenTri','screenVictory','screenSettings','screenDev','screenDevStory','screenLight','screenAbout','screenJoySettings','screenStory','screenStoryTest','screenStoryScene','screenDuelInvite','screenDuelIntro','screenStoryResult','screenSupport','screenAccount','screenAccSettings','screenFriends','screenChat','screenRoom'].forEach(id=>{
                const el=document.getElementById(id); if(el) el.classList.remove('active');
            });
            if(s) s.classList.add('active');
            initAudio();
            // 每个模式一首曲子：战斗按模式细分，其余按界面
            const sid=s?s.id:'';
            let tk='menu';
            if(sid==='screenBattle') tk=(gameMode==='storyduel'?'duel':(gameMode==='manual'?'manual':'battle'));
            else if(sid==='screenVS') tk=(gameMode==='storyduel'?'duel':'vs');
            else if(sid==='screenDuelInvite'||sid==='screenDuelIntro') tk='duel';
            else if(sid==='screenVictory'||sid==='screenStoryResult') tk=bgmWish||'victory';
            else if(sid==='screenStoryScene') tk='story';
            else if(sid==='screenStory') tk='map';
            else if(sid==='screenFreeSelect'||sid==='screenManualSelect'||sid==='screenBRSelect'||sid==='screenDualDraw'||sid==='screenStoryTest'||sid==='screenMode'||sid==='screenTri'||sid==='screenRoom') tk='select';
            bgmWish=null;
            setBgm(tk);
        }
        function goToMenu(){ if(gameMode==='online') onlineExit(); stopBattle(); showScreen(document.getElementById('screenMenu')); }
        function goToModeSelect(){ stopBattle(); resetDrawState(); showScreen(document.getElementById('screenMode')); }

        // ============ 状态重置 ============
        function resetDrawState(){
            drawSession++; // 使未完成的抽卡回调失效，防止竞态写入
            drawnCards={1:false,2:false};
            const dc1=document.getElementById('drawCard1'), dc2=document.getElementById('drawCard2');
            if(dc1) dc1.classList.remove('revealed','flipping');
            if(dc2) dc2.classList.remove('revealed','flipping');
            ['drawAvatar1','drawName1','drawAvatar2','drawName2'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=''; });
            const btn=document.getElementById('btnStartDualBattle'); if(btn) btn.style.display='none';
            player1Role=null; player2Role=null;
        }

        // ============ 模式选择（共用卡片构建） ============
        function buildRoleCards(listEl, onPick){
            if(!listEl) return;
            listEl.innerHTML='';
            visibleRoles().forEach(role=>{
                const card=document.createElement('div');
                card.className='card-display'; card.style.cssText='cursor:pointer;width:104px;flex:none;';
                card.dataset.roleId=role.id;
                card.innerHTML=`<span class="card-avatar">${role.avatar}</span><div class="card-name">${rn(role)}</div><div class="card-hp">❤️ ${role.hp}</div><div class="card-skill-info" style="height:34px;overflow:hidden;">${role.desc}</div>`;
                card.style.animationDelay=(ROLES.indexOf(role)*0.04)+'s';
                card.classList.add('card-in');
                card.addEventListener('click',()=>onPick(card,role));
                listEl.appendChild(card);
            });
        }

        // ============ 自由模式 ============
        function updateFreeSelection(){
            const cards = document.querySelectorAll('#freeRoleList .card-display');
            cards.forEach(card=>{
                card.classList.remove('selected');
                if(freeSelected.p1 && freeSelected.p1.id===card.dataset.roleId) card.classList.add('selected');
                if(freeSelected.p2 && freeSelected.p2.id===card.dataset.roleId) card.classList.add('selected');
            });
            if(freeSelected.p1 && freeSelected.p2){
                player1Role=freeSelected.p1; player2Role=freeSelected.p2;
                gameMode='free'; showVSIntro([player1Role, player2Role], ()=>initBattle([player1Role, player2Role]));
            }
            const resetBtn=document.getElementById('btnFreeReset');
            if(resetBtn) resetBtn.style.display = (freeSelected.p1||freeSelected.p2)?'inline-block':'none';
            const info=document.getElementById('freeSelectionInfo');
            if(info) info.textContent = freeSelected.p1 ? (freeSelected.p2?'✅ 开始！':'请选择玩家2') : '请选择玩家1';
        }
        function startFreeMode(){
            freeSelected={p1:null,p2:null};
            buildRoleCards(document.getElementById('freeRoleList'),(card,role)=>{
                sfxClick();
                if(!freeSelected.p1) freeSelected.p1=role;
                else if(!freeSelected.p2 && role.id!==freeSelected.p1.id) freeSelected.p2=role;
                updateFreeSelection();
            });
            updateFreeSelection();
            showScreen(document.getElementById('screenFreeSelect'));
        }

        // ============ 故事模式（3D 蜿蜒节点地图 + 逐关解锁） ============
        let storyClear=0, curStoryLevel=0, storyMe=null, storyAlly=null, storyFoe=null, sceneCut=0, L1idx=0;
        let battleLv=-1, battleObstacles=[];
        try{ storyClear=Math.max(0,parseInt(localStorage.getItem('storyClear')||'0',10)||0); }catch(e){}
        const RB=id=>ROLES.find(x=>x.id===id)||FUQIN_ROLE;
        const STORY_LEVELS=[
            { icon:'🏠', name:'序章 · 起床风波', foes:['fuqin'], desc:'父子间的第一场决斗，皮带 vs 打鼾，究竟谁能笑到最后？', made:true },
            { icon:'🏫', name:'第 1 关 · 教室风波', foes:['lichenyu'], allies:['liuyiming'], cutscene:true, desc:'上课偷聊三角洲被抓个正着！和同桌刘一鸣联手2v1对抗李晨雨，课桌椅挡路、弹道会反弹，队友阵亡会扣星！', made:true },
            { icon:'⭐', name:'第 2 关', made:false },
            { icon:'🎯', name:'第 3 关', made:false },
            { icon:'🔥', name:'第 4 关', made:false },
            { icon:'💠', name:'第 5 关', made:false },
            { icon:'🧩', name:'第 6 关', made:false },
            { icon:'☄️', name:'第 7 关', made:false },
            { icon:'🌀', name:'第 8 关', made:false },
            { icon:'👾', name:'第 9 关', made:false },
            { icon:'🏯', name:'第 10 关', made:false },
            { icon:'🏆', name:'第 11 关', made:false },
        ];
        const STORY_TOP=96, STORY_GAP=132;
        // 故事关卡隐藏开关（开发者选项）：默认隐藏第 1 关
        let storyHideSet=new Set();
        try{
            const raw=localStorage.getItem('storyHide');
            if(raw) storyHideSet=new Set(JSON.parse(raw));
            else storyHideSet=new Set([1]);
        }catch(e){ storyHideSet=new Set([1]); }
        function storyHideSave(){ try{ localStorage.setItem('storyHide',JSON.stringify([...storyHideSet])); }catch(e){} }
        function renderDevStoryList(){
            const box=document.getElementById('devStoryList'); if(!box) return;
            box.innerHTML='';
            STORY_LEVELS.forEach((lv,i)=>{
                const row=document.createElement('div');
                row.style.cssText='display:flex;justify-content:space-between;align-items:center;padding:9px 2px;border-top:1px solid rgba(255,255,255,0.1);'+(i===0?'border-top:none;':'');
                const name=document.createElement('span');
                name.style.cssText='color:#fff;font-size:13px;font-weight:700;text-align:left;flex:1;margin-right:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
                name.textContent=lv.icon+' '+lv.name+(lv.made?'':' 🚧');
                const btn=document.createElement('button');
                btn.type='button'; btn.className='light-toggle'+(storyHideSet.has(i)?' on':'');
                btn.innerHTML='<span class="knob"></span>';
                btn.title='隐藏该关卡';
                btn.addEventListener('click',()=>{
                    if(storyHideSet.has(i)) storyHideSet.delete(i); else storyHideSet.add(i);
                    storyHideSave(); sfxClick(); renderDevStoryList();
                });
                row.appendChild(name); row.appendChild(btn);
                box.appendChild(row);
            });
        }
        function buildStoryMap(){
            const world=document.getElementById('storyWorld');
            const scroll=document.getElementById('storyScroll');
            world.innerHTML=''; scroll.scrollTop=0;
            const w=world.clientWidth||360, N=STORY_LEVELS.length;
            // 跳过被隐藏的关卡：vis=[可见关卡的原始下标]，锁判定改用可见序号
            const vis=[];
            for(let i=0;i<N;i++){ if(!storyHideSet.has(i)) vis.push(i); }
            const M=vis.length;
            const H=STORY_TOP+(M-1)*STORY_GAP+110;
            world.style.height=H+'px';
            const pts=[];
            for(let k=0;k<M;k++){ pts.push({ x:w/2+Math.sin(vis[k]*0.85)*(w*0.30), y:STORY_TOP+k*STORY_GAP }); }
            let d='M'+pts[0].x+' '+pts[0].y;
            for(let i=0;i<pts.length-1;i++){
                const p0=pts[i-1]||pts[i], p1=pts[i], p2=pts[i+1], p3=pts[i+2]||pts[i+1];
                d+=' C'+(p1.x+(p2.x-p0.x)/6).toFixed(1)+' '+(p1.y+(p2.y-p0.y)/6).toFixed(1)+' '+(p2.x-(p3.x-p1.x)/6).toFixed(1)+' '+(p2.y-(p3.y-p1.y)/6).toFixed(1)+' '+p2.x.toFixed(1)+' '+p2.y.toFixed(1);
            }
            const NS='http://www.w3.org/2000/svg';
            const svg=document.createElementNS(NS,'svg');
            svg.setAttribute('class','story-path-svg'); svg.setAttribute('width',w); svg.setAttribute('height',H);
            [[22,'rgba(38,42,70,0.95)',''],[3,'rgba(240,192,96,0.28)','']].forEach(([sw,stroke])=>{
                const path=document.createElementNS(NS,'path');
                path.setAttribute('d',d); path.setAttribute('fill','none');
                path.setAttribute('stroke',stroke); path.setAttribute('stroke-width',''+sw);
                path.setAttribute('stroke-linecap','round'); path.setAttribute('stroke-linejoin','round');
                svg.appendChild(path);
            });
            world.appendChild(svg);
            [['🌲',12,150],['☁️',82,300],['🌲',8,560],['⭐',88,680],['🌲',86,900],['☁️',10,1080]].forEach(([ic,x,y],i)=>{
                const dec=document.createElement('div'); dec.className='story-deco'; dec.textContent=ic;
                dec.style.left=x+'%'; dec.style.top=y+'px'; dec.style.animationDelay=(i*0.6)+'s';
                world.appendChild(dec);
            });
            pts.forEach((p,k)=>{
                const i=vis[k];
                const b=document.createElement('button');
                if(i===0){ b.className='story-node house'; }
                else b.className='story-node cube'+(k%2?' alt':'');
                b.innerHTML='<span class="sn-face">'+STORY_LEVELS[i].icon+'</span>';
                b.style.left=p.x+'px'; b.style.top=p.y+'px';
                b.style.animationDelay=(k*0.07)+'s';
                const locked=k>storyClear;
                if(locked){
                    // 未解锁：灰化 + 锁角标，点击拒绝抖动
                    b.classList.add('locked');
                    const lk=document.createElement('span'); lk.className='sn-lock'; lk.textContent='🔒'; b.appendChild(lk);
                    b.addEventListener('click',()=>{ playSound(120,'square',0.12,0.1); b.classList.remove('denied'); void b.offsetWidth; b.classList.add('denied'); });
                }
                else {
                    if(k>0&&k<storyClear){ const ck=document.createElement('span'); ck.className='sn-check'; ck.textContent='✅'; b.appendChild(ck); }
                    b.addEventListener('click',()=>openStoryTest(i));
                }
                world.appendChild(b);
            });
        }
        function openStoryTest(i){
            sfxClick();
            curStoryLevel=i;
            const lv=STORY_LEVELS[i];
            const startBtn=document.getElementById('btnStoryTestStart');
            document.getElementById('storyTestIcon').textContent=lv.icon;
            document.getElementById('storyTestName').textContent=lv.name;
            if(lv.made){
                // 已制作关卡：显示介绍 + 开始游戏
                const allyTxt=(lv.allies&&lv.allies.length)?('队友：'+lv.allies.map(id=>rn(RB(id))).join('、')+'。'):'';
                document.getElementById('storyTestIntro').textContent=allyTxt+'对手：'+lv.foes.map(id=>rn(RB(id))).join('、')+'。'+storyMask(lv.desc);
                startBtn.style.display='';
            } else {
                // 未制作关卡：只显示占位提示，无开始按钮
                document.getElementById('storyTestIntro').textContent='🚧 该关卡未制作，正在制作中…';
                startBtn.style.display='none';
            }
            showScreen(document.getElementById('screenStoryTest'));
        }
        function startStoryLevelBattle(i){
            sfxClick();
            curStoryLevel=i;
            if(i===0){ startPrologue(); return; }
            if(!STORY_LEVELS[i]||!STORY_LEVELS[i].made) return; // 未制作关卡不可进入
            clearProTimers();
            if(STORY_LEVELS[i].cutscene){ startL1Cutscene(); return; } // 带开场的关卡先播剧情
            gameMode='storyduel';
            const lz=ROLES.find(x=>x.id==='lijiaze');
            const foes=STORY_LEVELS[i].foes.map(id=>RB(id));
            showVSIntro([lz,...foes],()=>initBattle([lz,...foes]));
        }

        // ============ 故事模式·序章（卧室剧情 + 父子决斗） ============
        const PROLOG=[
            { w:'nar', t:'因李嘉泽昨天晚上堵了一晚上的桥……' },
            { blink:'alarm' },
            { enter:true },
            { w:'fq', e:'😠', t:'李嘉泽，快起床😠！' },
            { w:'lz', e:'🥱', t:'知道了🥱……' },
            { blink:'close' },
            { w:'nar', t:'过了 10 分钟……' },
            { blink:'open' },
            { w:'fq', e:'😡', t:'你为什么还不起来😡！' },
            { w:'lz', e:'🥱', t:'知道了马上🥱！' },
            { w:'fq', e:'🤬', t:'🤬🤬🤬' },
            { duel:true }
        ];
        const STAR_INFO=[ ['😵','挑战失败'],['😫','勉强通关'],['🙁','艰难通关'],['😐','普通通关'],['🙂','顺利通关'],['😀','完美通关'] ];
        let proIdx=0, proBusy=false, proTypeTimer=0, proTimers=[], scoldStars=-1;
        function storyLzName(){ const r=ROLES.find(x=>x.id==='lijiaze'); return r?rn(r):'李嘉泽'; }
        function storyMask(t){ return t.split('李嘉泽').join(storyLzName()).split('刘一鸣').join(rn(RB('liuyiming'))).split('李晨雨').join(rn(RB('lichenyu'))); }
        function spkName(who){
            if(who==='fq') return '浮琴';
            if(who==='mq') return '木琴';
            if(who==='lz') return storyLzName();
            if(who==='lym') return rn(RB('liuyiming'));
            if(who==='lcy') return rn(RB('lichenyu'));
            return '';
        }
        function psetTimeout(fn,ms){ const id=setTimeout(()=>{ proTimers=proTimers.filter(x=>x!==id); fn(); },ms); proTimers.push(id); return id; }
        function clearProTimers(){ proTimers.forEach(clearTimeout); proTimers=[]; clearInterval(proTypeTimer); proTypeTimer=0; }
        const blinkOverlay=document.getElementById('blinkOverlay');
        function sfxBlip(){ playSound(480+Math.random()*160,'square',0.03,0.045); }
        function sfxWhoosh(down){ playSound(down?620:120,'sine',0.22,0.22,down?120:620); }
        function sfxAlarm(){ for(let i=0;i<8;i++){ setTimeout(()=>playSound(i%2?1180:940,'square',0.09,0.22),i*130); } }
        function sfxDoorOpen(){ playSound(520,'square',0.05,0.07); playSound(210,'sawtooth',0.5,0.09,72); [0,230,470,690].forEach(d=>psetTimeout(()=>playSound(74+Math.random()*18,'sine',0.1,0.12),d)); }
        function setSpeaker(who){
            document.querySelectorAll('.room-actor,.cls-actor').forEach(a=>a.classList.remove('speaking'));
            if(!who) return;
            const inCls=document.getElementById('screenStoryScene').classList.contains('in-class');
            const all=Array.from(document.querySelectorAll('.room-actor[data-key="'+who+'"], .cls-actor[data-key="'+who+'"]'));
            const tgt=inCls?all[all.length-1]:all[0];   // 教室内优先后出现的教室角色
            if(tgt) tgt.classList.add('speaking');
        }
        function applyEmoji(who,e){
            if(!e) return;
            const map={ lz:['emojiLz','cEmojiLz'], fq:['emojiFq'], mq:['emojiMq'], lym:['cEmojiLym'], lcy:['cEmojiLcy'] };
            (map[who]||[]).forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=e; });
        }
        function typeLine(text, who, emoji, done){
            const dlg=document.getElementById('dlgText'), sp=document.getElementById('dlgSpeaker'), next=document.getElementById('dlgNext');
            next.style.visibility='hidden';
            if(who==='nar'){ sp.style.visibility='hidden'; dlg.classList.add('nar'); }
            else { sp.style.visibility='visible'; dlg.classList.remove('nar'); document.getElementById('dlgEmoji').textContent=emoji||''; document.getElementById('dlgName').textContent=spkName(who); }
            text=storyMask(text);
            dlg.textContent=''; let i=0;
            clearInterval(proTypeTimer);
            proTypeTimer=setInterval(()=>{
                i++; dlg.textContent=text.slice(0,i);
                if(i%2===0) sfxBlip();
                if(i>=text.length){ clearInterval(proTypeTimer); proTypeTimer=0; next.style.visibility='visible'; done&&done(true); }
            },46);
            proTypeFill=()=>{ clearInterval(proTypeTimer); proTypeTimer=0; dlg.textContent=text; next.style.visibility='visible'; done&&done(false); };
        }
        let proTypeFill=null;
        function startPrologue(){
            clearProTimers(); proBusy=false; proIdx=0; scoldStars=-1; sceneCut=0;
            const scr0=document.getElementById('screenStoryScene');
            scr0.classList.remove('in-class','kick-shake');
            const lzEl0=document.getElementById('actorLz');
            lzEl0.classList.remove('kick-fly'); lzEl0.style.transform=''; lzEl0.style.opacity='';
            document.getElementById('emojiLz').textContent='😴';
            document.getElementById('emojiFq').textContent='👨';
            document.getElementById('tagLz').textContent=storyLzName();
            document.querySelectorAll('.room-actor').forEach(a=>a.classList.remove('speaking'));
            document.getElementById('actorLz').classList.add('sleeping');
            document.getElementById('roomDoor').classList.remove('open');
            document.getElementById('slotFq').classList.add('off');
            document.getElementById('slotMq').classList.add('off');
            document.getElementById('roomAlarm').classList.remove('ring');
            blinkOverlay.classList.remove('blink-close','blink-open','blink-alarm');
            document.getElementById('screenStoryScene').classList.remove('over-lid');
            showScreen(document.getElementById('screenStoryScene'));
            psetTimeout(runProStep,250);
        }
        function runProStep(){
            if(proIdx>=PROLOG.length) return;
            const st=PROLOG[proIdx];
            if(st.blink){
                proBusy=true; setSpeaker(null);
                blinkOverlay.classList.remove('blink-close','blink-open','blink-alarm');
                void blinkOverlay.offsetWidth;
                if(st.blink==='close'){
                    blinkOverlay.classList.add('blink-close'); document.getElementById('screenStoryScene').classList.add('over-lid'); sfxWhoosh(true);
                    psetTimeout(()=>{ proBusy=false; proIdx++; runProStep(); },190);
                }
                else if(st.blink==='open'){
                    blinkOverlay.classList.add('blink-open'); document.getElementById('screenStoryScene').classList.remove('over-lid'); sfxWhoosh();
                    psetTimeout(()=>{ blinkOverlay.classList.remove('blink-close','blink-open'); proBusy=false; proIdx++; runProStep(); },350);
                }
                else {
                    blinkOverlay.classList.add('blink-alarm'); sfxWhoosh(true);
                    document.getElementById('roomAlarm').classList.add('ring');
                    psetTimeout(()=>sfxAlarm(),560);
                    psetTimeout(()=>{ blinkOverlay.classList.remove('blink-alarm'); document.getElementById('roomAlarm').classList.remove('ring'); proBusy=false; proIdx++; runProStep(); },1080);
                }
                return;
            }
            if(st.enter){
                proBusy=true; setSpeaker(null);
                document.getElementById('roomDoor').classList.add('open');
                sfxDoorOpen();
                psetTimeout(()=>{ document.getElementById('slotFq').classList.remove('off'); },560);
                psetTimeout(()=>{ document.getElementById('slotMq').classList.remove('off'); },820);
                psetTimeout(()=>{ proBusy=false; proIdx++; runProStep(); },1750);
                return;
            }
            if(st.duel){ showDuelChoice(); return; }
            proBusy=true;
            setSpeaker(st.w);
            if(st.w==='lz'){ document.getElementById('actorLz').classList.remove('sleeping'); document.getElementById('emojiLz').textContent=st.e||'🥱'; }
            if(st.w==='fq') document.getElementById('emojiFq').textContent=st.e||'👨';
            if(st.w==='nar') playSound(300,'sine',0.08,0.12);
            typeLine(st.t, st.w, st.e, ()=>{ proBusy=false; });
        }
        function onDlgTap(){
            if(scoldStars>=0){
                if(proTypeTimer&&proTypeFill){ if(proTypeFill) proTypeFill(); proBusy=false; return; }
                const s=scoldStars; scoldStars=-1; showStoryResult(s); return;
            }
            if(proBusy){
                if(proTypeTimer&&proTypeFill){ proBusy=false; proTypeFill(); }
                return;
            }
            if(sceneCut===1){
                const s1=L1CUT[L1idx];
                if(s1&&s1.duel1) return;
                L1idx++; runL1Step();
                return;
            }
            const st=PROLOG[proIdx];
            if(st&&st.duel) return;
            proIdx++; runProStep();
        }
        function showDuelChoice(){
            proBusy=true; setSpeaker('fq');
            document.getElementById('emojiFq').textContent='🤬';
            typeLine('李嘉泽！我要和你决斗！🤬','fq','🤬',()=>{
                proBusy=false;
                document.getElementById('dlgNext').style.visibility='hidden';
                showDuelInvite();
            });
        }
        function showDuelInvite(){
            const from=document.getElementById('ivFrom'), to=document.getElementById('ivTo'), av=document.getElementById('ivAvatar'), sub=document.getElementById('ivSub');
            if(curStoryLevel===1){
                if(from) from.textContent=rn(RB('lichenyu'));
                if(to) to.textContent=storyLzName()+'、'+rn(RB('liuyiming'));
                if(av) av.textContent='😡';
                if(sub) sub.textContent='声波 VS Z字弹+鸡米花 · 教室2v1决战';
            } else {
                if(from) from.textContent='浮琴';
                if(to) to.textContent=storyLzName();
                if(av) av.textContent='🤬';
                if(sub) sub.textContent='七匹狼 VS Z字弹 · 卧室父子决战';
            }
            showScreen(document.getElementById('screenDuelInvite'));
            playSound(150,'sawtooth',0.35,0.16,70);
            psetTimeout(()=>playSound(920,'square',0.12,0.09,1500),130);
            psetTimeout(()=>playSound(1260,'square',0.18,0.08,760),270);
        }
        function fqScoldThen(stars){
            clearProTimers();
            sceneCut=0;
            const scr=document.getElementById('screenStoryScene');
            scr.classList.remove('in-class','kick-shake');
            blinkOverlay.classList.remove('blink-close','blink-open','blink-alarm');
            scr.classList.remove('over-lid');
            document.querySelectorAll('.room-actor,.cls-actor').forEach(a=>a.classList.remove('speaking'));
            showScreen(scr);
            psetTimeout(()=>{
                setSpeaker('fq'); document.getElementById('emojiFq').textContent='🤬';
                typeLine('赶紧给我去学校🤬🤬🤬','fq','🤬',()=>{ proBusy=false; scoldStars=stars; });
            },200);
        }

        // ============ 故事第1关·教室风波（卧室开场 → 踢进教室 → 2v1决斗） ============
        const L1CUT=[
            { w:'mq', e:'😠', t:'别忘了还有我呢😠' },
            { kick:true },
            { bell:true },
            { w:'lcy', e:'😡', t:'上课了 你们都没听见吗😡' },
            { w:'nar', t:'过了一会……' },
            { w:'lym', e:'🧐', t:'你昨天晚上三角洲怎么一直在线 是不是又去堵桥了🧐' },
            { w:'lz', e:'😐', t:'是呀 怎么了' },
            { w:'lz', e:'😋', t:'我昨天晚上堵桥赚了 700 万😋' },
            { w:'lcy', e:'😡', t:'李嘉泽你是不是又在说话😡😡😡 还有你刘一鸣😡😡😡 一人给我扣 10 分😡😡😡' },
            { duel1:true }
        ];
        function sfxKick(){ playSound(90,'sawtooth',0.3,0.26,48); setTimeout(()=>playSound(760,'square',0.1,0.14,190),35); }
        function sfxBell(){ [0,180,360,540,720,900].forEach((d,i)=>{ setTimeout(()=>playSound(i%2?1250:1560,'triangle',0.16,0.30),d); }); }
        function startL1Cutscene(){
            clearProTimers(); proBusy=false; sceneCut=1; L1idx=0; scoldStars=-1;
            const scr=document.getElementById('screenStoryScene');
            scr.classList.remove('in-class','over-lid','kick-shake');
            const lzEl=document.getElementById('actorLz');
            lzEl.classList.remove('sleeping','kick-fly'); lzEl.style.transform=''; lzEl.style.opacity='';
            document.getElementById('emojiLz').textContent='😐';
            document.getElementById('tagLz').textContent=storyLzName();
            document.getElementById('slotFq').classList.add('off');
            document.getElementById('slotMq').classList.remove('off');
            document.getElementById('roomDoor').classList.remove('open');
            document.getElementById('roomAlarm').classList.remove('ring');
            blinkOverlay.classList.remove('blink-close','blink-open','blink-alarm');
            const bell=document.getElementById('clsBell'); if(bell) bell.classList.remove('ringing');
            const clz=document.getElementById('clsLz'); if(clz) clz.classList.remove('landing');
            applyEmoji('lcy','👧'); applyEmoji('lym','🧑‍🎓'); applyEmoji('lz','😐'); applyEmoji('mq','😠');
            document.querySelectorAll('.room-actor,.cls-actor').forEach(a=>a.classList.remove('speaking'));
            showScreen(scr);
            psetTimeout(runL1Step,250);
        }
        function runL1Step(){
            if(L1idx>=L1CUT.length) return;
            const st=L1CUT[L1idx];
            const scr=document.getElementById('screenStoryScene');
            if(st.kick){
                proBusy=true; setSpeaker('mq');
                document.getElementById('dlgNext').style.visibility='hidden';
                const lzEl=document.getElementById('actorLz');
                sfxKick(); scr.classList.add('kick-shake');
                lzEl.classList.add('kick-fly'); void lzEl.offsetWidth;
                lzEl.style.transform='translate(42vw,-38vh) rotate(1040deg) scale(0.45)';
                lzEl.style.opacity='0';
                psetTimeout(()=>{ // 踢进教室：切场景 + 李嘉泽落座
                    scr.classList.add('in-class');
                    scr.classList.remove('kick-shake');
                    const clz=document.getElementById('clsLz');
                    clz.classList.remove('landing'); void clz.offsetWidth; clz.classList.add('landing');
                    playSound(150,'square',0.22,0.2,60);
                },760);
                psetTimeout(()=>{ proBusy=false; L1idx++; runL1Step(); },1450);
                return;
            }
            if(st.bell){
                proBusy=true; setSpeaker(null);
                document.getElementById('dlgNext').style.visibility='hidden';
                const bell=document.getElementById('clsBell'); if(bell) bell.classList.add('ringing');
                sfxBell();
                psetTimeout(()=>{ if(bell) bell.classList.remove('ringing'); proBusy=false; L1idx++; runL1Step(); },1250);
                return;
            }
            if(st.duel1){ showDuelInvite(); return; }
            proBusy=true;
            setSpeaker(st.w); applyEmoji(st.w, st.e);
            if(st.w==='nar') playSound(300,'sine',0.08,0.12);
            typeLine(st.t, st.w, st.e, ()=>{ proBusy=false; });
        }
        function lcyScoldThen(stars){
            clearProTimers();
            sceneCut=1;
            const scr=document.getElementById('screenStoryScene');
            scr.classList.remove('over-lid','kick-shake');
            scr.classList.add('in-class');
            blinkOverlay.classList.remove('blink-close','blink-open','blink-alarm');
            document.querySelectorAll('.room-actor,.cls-actor').forEach(a=>a.classList.remove('speaking'));
            showScreen(scr);
            psetTimeout(()=>{
                setSpeaker('lcy'); applyEmoji('lcy','😡😡😡');
                typeLine('你们俩直接给我扣 20 分😡😡😡','lcy','😡😡😡',()=>{ proBusy=false; scoldStars=stars; });
            },200);
        }
        function startL1Battle(){
            clearProTimers();
            gameMode='storyduel';
            const lz=ROLES.find(x=>x.id==='lijiaze');
            showVSIntro([lz,RB('liuyiming'),RB('lichenyu')],()=>initBattle([lz,RB('liuyiming'),RB('lichenyu')]));
        }

        // ============ 父子决斗（手动） ============
        function startStoryDuel(){
            clearProTimers();
            gameMode='storyduel';
            const lz=ROLES.find(x=>x.id==='lijiaze');
            showStoryDuelIntro(()=>initBattle([lz,FUQIN_ROLE]));
        }
        function showStoryDuelIntro(cb){
            const s=document.getElementById('screenDuelIntro');
            s.classList.remove('go');
            showScreen(s); void s.offsetWidth;
            psetTimeout(()=>s.classList.add('go'),30);
            sfxWhoosh();
            psetTimeout(()=>playSound(160,'square',0.18,0.4,60),280);
            psetTimeout(()=>{ playSound(1200,'square',0.12,0.3,200); playSound(70,'sawtooth',0.25,0.3); },450);
            psetTimeout(cb,1650);
        }
        function storyDuelEnd1(win){
            const lz=storyMe, ally=storyAlly;
            stopBattle();
            if(win){
                // 评星按存活者血量比例 5/4/3/2；队友阵亡（非双人存活）统一扣 1 星
                const bothAlive=(lz&&lz.hp>0)&&(ally&&ally.hp>0);
                const src=(lz&&lz.hp>0)?lz:((ally&&ally.hp>0)?ally:null);
                const ratio=src?Math.max(0,src.hp/src.maxHp):0;
                let stars=ratio>=0.75?5:ratio>=0.5?4:ratio>=0.25?3:2;
                if(!bothAlive) stars=Math.max(1,stars-1);
                storyClear=Math.max(storyClear,curStoryLevel+1);
                try{ localStorage.setItem('storyClear',''+storyClear); }catch(e){}
                psetTimeout(()=>showStoryResult(stars),200);
            } else {
                // 两人都死：李晨雨训话后 0 星，直接不通关
                lcyScoldThen(0);
            }
        }
        function storyDuelEnd(win, ratio){
            stopBattle();
            // 赢：按自己剩余血量定星（2~5星）；输：一律 0 星失败，绝不按敌方血量评星
            const stars=win?(ratio>=0.75?5:ratio>=0.5?4:ratio>=0.25?3:2):0;
            if(win){ storyClear=Math.max(storyClear,curStoryLevel+1); try{ localStorage.setItem('storyClear',''+storyClear); }catch(e){} }
            // 序章败北：浮琴训斥"赶紧给我去学校🤬🤬🤬"后 0 星失败；其余关卡失败直接 0 星
            psetTimeout(()=>{ if(!win&&curStoryLevel===0) fqScoldThen(0); else showStoryResult(stars); },200);
        }

        // ============ 星级结算 ============
        let srStars=0;
        function showStoryResult(stars){
            srStars=stars;
            const scr=document.getElementById('screenStoryResult'), title=document.getElementById('srTitle'), face=document.getElementById('srFace'), rate=document.getElementById('srRate'), box=document.getElementById('srStars'), btns=document.getElementById('srBtns'), cf=document.getElementById('srConfetti');
            scr.classList.remove('fail','shake'); title.classList.remove('in'); face.classList.remove('in'); btns.classList.remove('show'); rate.textContent=''; cf.innerHTML='';
            box.innerHTML=''; for(let i=0;i<5;i++){ const sp=document.createElement('span'); sp.className='sr-star'; sp.textContent='★'; box.appendChild(sp); }
            const fail=stars===0;
            if(fail) scr.classList.add('fail');
            title.textContent=stars===0?'挑战失败':'通 关';
            face.textContent=STAR_INFO[stars][0];
            bgmWish=fail?'lose':'victory';
            showScreen(scr);
            if(fail){ playSound(200,'sawtooth',0.5,0.3,70); psetTimeout(()=>scr.classList.add('shake'),200); }
            else sfxWin();
            psetTimeout(()=>face.classList.add('in'),250);
            psetTimeout(()=>title.classList.add('in'),500);
            const lit=[];
            for(let i=0;i<stars;i++){ psetTimeout(()=>{ lit[i]=box.children[i]; if(lit[i]) lit[i].classList.add('lit'); playSound(523+i*130,'triangle',0.16,0.3); if(i===stars-1) playSound(1046,'triangle',0.3,0.32); },820+i*330); }
            psetTimeout(()=>{
                rate.textContent=STAR_INFO[stars][1];
                btns.classList.add('show');
                if(!fail){
                    const colors=['#f0c060','#ff6b8a','#66ccff','#90ee90','#c8a0ff'];
                    const n=stars>=4?22:14;
                    for(let i=0;i<n;i++){ const c=document.createElement('span'); c.className='confetti'; c.style.left=(Math.random()*100)+'%'; c.style.background=colors[i%colors.length]; c.style.animationDelay=(Math.random()*0.8)+'s'; c.style.animationDuration=(1.6+Math.random()*1.4)+'s'; cf.appendChild(c); }
                }
            },820+stars*330+450);
        }

        // ============ 手动对战 ============
        function startManualMode(){
            manualMyRole=null; manualEnemyRole=null; manualLaunched=false;
            buildRoleCards(document.getElementById('manualRoleList'),(card,role)=>{
                sfxClick();
                if(!manualMyRole) manualMyRole=role;
                else if(!manualEnemyRole && role.id!==manualMyRole.id) manualEnemyRole=role;
                updateManualSelection();
            });
            updateManualSelection();
            showScreen(document.getElementById('screenManualSelect'));
        }
        function updateManualSelection(){
            document.querySelectorAll('#manualRoleList .card-display').forEach(c=>{
                c.classList.toggle('selected',(manualMyRole&&manualMyRole.id===c.dataset.roleId)||(manualEnemyRole&&manualEnemyRole.id===c.dataset.roleId));
            });
            const info=document.getElementById('manualSelectionInfo');
            if(info) info.innerHTML = manualMyRole ? (manualEnemyRole ? '✅ <b>'+rn(manualMyRole)+'</b> VS <b>'+rn(manualEnemyRole)+'</b> 准备战斗！' : '已选 <b>'+rn(manualMyRole)+'</b>，请选择<b>敌方角色</b>') : '请选择<b>你的角色</b>（左下摇杆移动，右下摇杆放技能）';
            const resetBtn=document.getElementById('btnManualReset'); if(resetBtn) resetBtn.style.display=(manualMyRole||manualEnemyRole)?'inline-block':'none';
            if(manualMyRole&&manualEnemyRole&&!manualLaunched){
                manualLaunched=true;
                gameMode='manual';
                showVSIntro([manualMyRole,manualEnemyRole],()=>initBattle([manualMyRole,manualEnemyRole]));
            }
        }

        // ============ 双人对战 ============
        function startDualMode(){ gameMode='dual'; resetDrawState(); showScreen(document.getElementById('screenDualDraw')); }
        function drawCard(num){
            initAudio(); if(drawnCards[num]) return; drawnCards[num]=true; sfxDraw();
            const session=drawSession; // 记录会话，期间重置则丢弃过期结果
            const cardEl=document.getElementById(num===1?'drawCard1':'drawCard2');
            const avatarEl=document.getElementById(num===1?'drawAvatar1':'drawAvatar2');
            const nameEl=document.getElementById(num===1?'drawName1':'drawName2');
            const pool=visibleRoles(); const role=pool[Math.floor(Math.random()*pool.length)];
            if(avatarEl) avatarEl.textContent=role.avatar; // 提前填充内容，翻过90°后正面才可见
            if(nameEl) nameEl.textContent=rn(role);
            if(cardEl) cardEl.classList.add('flipping');
            setTimeout(()=>{
                if(session!==drawSession) return;
                if(cardEl){ cardEl.classList.remove('flipping'); cardEl.classList.add('revealed'); sfxSlam(); }
                if(num===1) player1Role=role; else player2Role=role;
                if(drawnCards[1]&&drawnCards[2]){ const btn=document.getElementById('btnStartDualBattle'); if(btn) btn.style.display='inline-block'; }
            },700);
        }
        function startDualBattle(){ if(!player1Role||!player2Role) return; gameMode='dual'; showVSIntro([player1Role, player2Role], ()=>initBattle([player1Role, player2Role])); }

        // ============ 大乱斗 ============
        function updateBRSelection(){
            const cards = document.querySelectorAll('#brRoleList .card-display');
            brSelectedRoles = [];
            cards.forEach(card=>{
                if(card.classList.contains('selected')){
                    const roleId = card.dataset.roleId;
                    const role = ROLES.find(r=>r.id===roleId);
                    if(role) brSelectedRoles.push(role);
                }
            });
            const btn=document.getElementById('btnStartBR');
            const info=document.getElementById('brSelectionInfo');
            if(btn) btn.style.display = (brSelectedRoles.length>=2) ? 'inline-block' : 'none';
            if(info) info.textContent = `已选 ${brSelectedRoles.length} 个角色 (最少2个)`;
        }
        function startBRMode(){
            brSelectedRoles=[];
            buildRoleCards(document.getElementById('brRoleList'),(card)=>{
                sfxClick();
                card.classList.toggle('selected');
                updateBRSelection();
            });
            updateBRSelection();
            showScreen(document.getElementById('screenBRSelect'));
        }
        function startBRBattle(){
            if(brSelectedRoles.length<2) return;
            gameMode='br';
            showVSIntro([...brSelectedRoles], ()=>initBattle([...brSelectedRoles]));
        }

        // ============ 三合一（开发者选项：自由/双人/大乱斗融合，扇形卡牌堆选人） ============
        let triPicked=[], triIdx=0, triWheelTs=0, triDrag=null;
        const triCards=new Map();   // 槽位slot → 卡片元素：元素与角色身份绑定持久存在，切换只重排位置（CSS过渡自然衔接）
        function triRoleAt(k){ const d=visibleRoles(), i=((k%d.length)+d.length)%d.length; return d[i]; }
        function triTf(o){ return 'translate('+(o*46)+'px,'+(Math.abs(o)*9)+'px) rotate('+(o*8)+'deg) scale('+(1-Math.abs(o)*0.07).toFixed(3)+')'; }
        function triNewCard(slot){   // 建一张卡，内容按 slot 对应角色固定，永不改变
            const role=triRoleAt(slot), c=document.createElement('div');
            c.className='tri-card'; c.dataset.slot=String(slot);
            c.innerHTML='<span class="tc-av">'+role.avatar+'</span><div class="tc-nm">'+rn(role)+'</div><div class="tc-hp">❤️ '+role.hp+'</div><div class="tc-sk">'+role.desc+'</div>';
            c.style.opacity='0'; c.style.pointerEvents='none'; return c;
        }
        function syncTriDeck(){   // 逐槽重排：持久元素只改 transform/opacity → 平滑非线性位移动画
            const fan=document.getElementById('triFan'); if(!fan) return;
            for(let o=-3;o<=3;o++){
                const slot=triIdx+o; let c=triCards.get(slot);
                if(!c){ c=triNewCard(slot); triCards.set(slot,c); fan.appendChild(c); }
                c.style.zIndex=String(100-Math.abs(o));
                c.style.opacity=Math.abs(o)>2?'0':'1';
                c.style.pointerEvents=o===0?'auto':'none';
                c.style.transform=triTf(o);
            }
            triCards.forEach((c,slot)=>{ if(Math.abs(slot-triIdx)>4){ c.remove(); triCards.delete(slot); } });
        }
        function triSyncUI(){
            const st=document.getElementById('btnTriStart'); if(st) st.style.display=triPicked.length>=2?'inline-block':'none';
            const h=document.getElementById('triHint');
            if(h) h.textContent=triPicked.length>=2?('已放入 '+triPicked.length+' 张 · 数量不限，点「开始」开打，点卡槽可移除'):'左右拖动或滚轮切换卡牌 · 上滑或点击把当前卡放进卡槽 · 点卡槽可移除';
        }
        function triChipNode(role){   // 单个卡槽芯片：点击移除自己（增量增删，不重建整排→不重播动画）
            const s=document.createElement('div'); s.className='tri-slot'; s.title='点击移除';
            s.innerHTML='<span class="ts-av">'+role.avatar+'</span><span class="ts-nm">'+rn(role)+'</span>';
            s.addEventListener('click',()=>{
                sfxClick();
                const box=document.getElementById('triSlots');
                const idx=[...box.querySelectorAll('.tri-slot')].indexOf(s);
                if(idx>=0) triPicked.splice(idx,1);
                s.remove();
                if(!triPicked.length) updateTriSlots(); else triSyncUI();
            });
            return s;
        }
        function updateTriSlots(){
            const box=document.getElementById('triSlots'); if(!box) return;
            box.innerHTML='';
            if(!triPicked.length){
                const d=document.createElement('div'); d.className='ts-empty'; d.innerHTML='把卡牌<b>上滑</b>或<b>点击</b>放进这里<br>（同一角色可放多次，数量不限）'; box.appendChild(d);
            }else triPicked.forEach(role=>box.appendChild(triChipNode(role)));
            triSyncUI();
        }
        function triAddChip(role){   // 增量追加一个芯片（先测量就位位置，下一帧再播放入场动画），返回元素
            const box=document.getElementById('triSlots'); if(!box) return null;
            const em=box.querySelector('.ts-empty'); if(em) em.remove();
            const s=triChipNode(role); box.appendChild(s);
            box.scrollLeft=box.scrollWidth;
            triSyncUI(); return s;
        }
        function triPickCard(c,dx,dy){   // 克隆一份飞进卡槽（原牌堆完全不动 → 不跳转、可无限重复选同一角色）
            const role=triRoleAt(triIdx);
            const cr=c.getBoundingClientRect();
            triPicked.push(role); sfxClick();
            const chip=triAddChip(role);
            const target=chip?chip.getBoundingClientRect():document.getElementById('triSlots').getBoundingClientRect();
            if(chip) requestAnimationFrame(()=>chip.classList.add('in'));   // 就位位置测完后再弹入
            const fly=c.cloneNode(true);                 // 克隆卡：唯一在动的元素，从手指位置平滑飞向卡槽
            fly.removeAttribute('data-slot'); fly.classList.remove('dragging');
            fly.style.pointerEvents='none'; fly.style.zIndex='130';
            document.getElementById('triFan').appendChild(fly);
            const bw=fly.offsetWidth||108, s0=cr.width/bw, s1=target.width/bw;
            fly.style.transition='none';
            fly.style.transform='translate('+(dx||0)+'px,'+(dy||0)+'px) rotate('+((dx||0)*0.06).toFixed(2)+'deg) scale('+s0.toFixed(3)+')';
            void fly.offsetWidth;                        // 提交起点（手指位置），保证过渡从当前位置平滑起飞
            const tx=(target.left+target.width/2)-(cr.left+cr.width/2)+(dx||0);
            const ty=(target.top+target.height/2)-(cr.top+cr.height/2)+(dy||0);
            fly.style.transition='transform 0.5s cubic-bezier(0.19,1,0.22,1), opacity 0.18s ease 0.34s';
            fly.style.transform='translate('+tx.toFixed(1)+'px,'+ty.toFixed(1)+'px) rotate(0deg) scale('+s1.toFixed(3)+')';
            fly.style.opacity='0';
            setTimeout(()=>fly.remove(),560);
            c.classList.remove('dragging');              // 原卡弹回中心继续留在牌堆
            c.style.transform=triTf(0);
        }
        function triStep(dir){
            triIdx+=dir; syncTriDeck(); sfxClick();
        }
        function startTriMode(){
            triPicked=[]; triIdx=0; triDrag=null;
            triCards.forEach(c=>c.remove()); triCards.clear();
            updateTriSlots(); syncTriDeck();
            showScreen(document.getElementById('screenTri'));
        }
        function startTriBattle(){
            if(triPicked.length<2) return;
            gameMode='tri';
            showVSIntro([...triPicked], ()=>initBattle([...triPicked]));
        }
        function bindTriFan(){
            const fan=document.getElementById('triFan'); if(!fan) return;
            fan.addEventListener('pointerdown',e=>{
                if(triDrag) return;
                const card=e.target.closest('.tri-card');
                const isCenter=!!card&&card.dataset.slot===String(triIdx);
                if(isCenter) card.classList.add('dragging');
                triDrag={x:e.clientX,y:e.clientY,dx:0,dy:0,card:isCenter?card:null};
                try{ fan.setPointerCapture(e.pointerId); }catch(err){}
            });
            fan.addEventListener('pointermove',e=>{
                if(!triDrag) return;
                const d=triDrag; d.dx=e.clientX-d.x; d.dy=e.clientY-d.y;
                if(d.card) d.card.style.transform='translate('+d.dx+'px,'+d.dy+'px) rotate('+(d.dx*0.06).toFixed(2)+'deg) scale(1)';
                else{ fan.style.transition='none'; fan.style.transform='translateX('+(d.dx*0.6).toFixed(1)+'px)'; }   // 扇面空白处拖动 → 整副牌跟手
            });
            const triFinish=()=>{
                if(!triDrag) return;
                const d=triDrag; triDrag=null;
                if(d.card){
                    const c=d.card; c.classList.remove('dragging');
                    if(d.dy<-56||(Math.abs(d.dx)<10&&Math.abs(d.dy)<10)) triPickCard(c,d.dx,d.dy);   // 上滑或点击 → 飞入卡槽
                    else if(d.dx<-44||d.dx>44) triStep(d.dx>0?-1:1);                                // 横滑 → 牌堆旋转
                    else c.style.transform=triTf(0);                                                // 回弹
                }else{
                    fan.style.transition='transform 0.38s cubic-bezier(0.25,0.46,0.45,0.94)';
                    fan.style.transform='';
                    if(Math.abs(d.dx)>44) triStep(d.dx>0?-1:1);
                }
            };
            fan.addEventListener('pointerup',triFinish);
            fan.addEventListener('pointercancel',triFinish);
            const scr=document.getElementById('screenTri');
            if(scr) scr.addEventListener('wheel',e=>{                               // 滚轮挂整屏，避免扇形区之外无效果
                e.preventDefault();
                const now=Date.now(); if(now-triWheelTs<240) return; triWheelTs=now;
                triStep((e.deltaY||e.deltaX)>0?1:-1);
            },{passive:false});
        }
        bindTriFan();

        // ============ VS开场动画 ============
        let vsTimer=null;
        function sfxVS(){ playSound(110,'sawtooth',0.3,0.4,45); playSound(500,'square',0.35,0.18,1400); }
        function showVSIntro(roles, onDone){
            showScreen(document.getElementById('screenVS'));
            const c1=document.getElementById('vsCard1'), c2=document.getElementById('vsCard2'), multi=document.getElementById('vsCardMulti'), word=document.getElementById('vsLogoWord');
            multi.innerHTML=''; word.textContent='VS'; word.classList.remove('small3');
            c1.style.display=''; c2.style.display=''; multi.style.display='none';
            if(roles.length===2){
                [[roles[0],'vsAvatar1','vsName1','vsHp1',c1],[roles[1],'vsAvatar2','vsName2','vsHp2',c2]].forEach(([role,aid,nid,hid,card])=>{
                    const a=document.getElementById(aid), n=document.getElementById(nid), h=document.getElementById(hid);
                    if(a) a.textContent=role.avatar;
                    if(n) n.textContent=rn(role);
                    if(h) h.textContent='❤️ '+role.hp;
                    if(card){ card.style.borderColor=role.color; card.style.boxShadow='0 0 28px '+role.color+'66'; }
                });
            }else{
                c1.style.display='none'; c2.style.display='none'; multi.style.display='block';
                const storyVs=(gameMode==='storyduel');
                word.textContent=storyVs?'VS':'大乱斗'; word.classList.add('small3');
                const N=roles.length, maxW=Math.min(window.innerWidth*0.86,400), half=Math.sin(Math.PI/N);
                let cw=N<=4?120:N<=6?96:80;
                const need=cw/(2*half)+cw/2;
                if(need*2>maxW) cw=Math.max(56,cw*(maxW/2)/need);
                const R=cw/(2*half);
                roles.forEach((r,i)=>{
                    const th=-Math.PI/2+i*(Math.PI*2/N);
                    const d=document.createElement('div');
                    d.className='vs-card mini';
                    d.style.cssText='width:'+cw+'px;height:'+cw+'px;margin-left:'+(-cw/2)+'px;margin-top:'+(-cw/2)+'px;left:calc(50% + '+(Math.cos(th)*R).toFixed(1)+'px);top:calc(50% + '+(Math.sin(th)*R).toFixed(1)+'px);border-color:'+r.color+';box-shadow:0 0 20px '+r.color+'66;--fx:'+(Math.cos(th)*R*2.6).toFixed(1)+'px;--fy:'+(Math.sin(th)*R*2.6).toFixed(1)+'px;animation-delay:'+(i*0.05).toFixed(2)+'s';
                    d.innerHTML='<span class="vs-avatar" style="font-size:'+Math.round(cw*0.4)+'px">'+r.avatar+'</span><div class="vs-name" style="font-size:10px">'+rn(r)+'</div>';
                    multi.appendChild(d);
                });
            }
            sfxVS();
            if(vsTimer) clearTimeout(vsTimer);
            vsTimer=setTimeout(()=>{ vsTimer=null; onDone(); },1500);
        }

        // ============ 实体创建 ============
        function createEntity(role, owner, index, total, isSummoned=false){
            const margin=role.size+15;
            let x,y,vx,vy;
            if((gameMode==='dual'||gameMode==='online') && !isSummoned){
                if(owner==='player1'){ x=arenaSize/2; y=arenaSize-margin; vx=(Math.random()-0.5)*role.moveSpeed*2; vy=-role.moveSpeed*0.8; }
                else { x=arenaSize/2; y=margin; vx=(Math.random()-0.5)*role.moveSpeed*2; vy=role.moveSpeed*0.8; }
            }else{
                const angle=(index/total)*Math.PI*2 + Math.random()*0.5;
                const dist=arenaSize*0.3;
                x=arenaSize/2 + Math.cos(angle)*dist;
                y=arenaSize/2 + Math.sin(angle)*dist;
                vx=(Math.random()-0.5)*role.moveSpeed*2;
                vy=(Math.random()-0.5)*role.moveSpeed*2;
            }
            return {role, owner, x, y, vx, vy, hp:role.hp, maxHp:role.hp, size:role.size,
                lastSkillTime:performance.now()-Math.random()*role.skillInterval,
                flashTimer:0, frozenUntil:0, lastFrozenTick:0,
                isEmperor: role.id==='emperor', summoner: null, frozenLabelEl: null,
                isParent:false, mother:null, parentAtkUntil:0,
                liukunAtkUntil:0,
                chargeTimer:(role.id==='liukun'?performance.now()+10000:0),
                charging:null,
                lastSecondTime:performance.now()+8000,
                revived: false, invincibleUntil: 0, spawnTimer: 0,
                uid: ++uidCounter, hudFillEl: null, hudTextEl: null, isManual:false };
        }

        // ============ 战斗初始化 ============
        function initBattle(roleList){
            stopBattle(); initAudio(); battleActive=true; projectiles=[]; particles=[]; smokes=[]; foods=[]; foodTimer=performance.now()+5000; hudSignature='';
            _lastUpdateTs=0;
            // 联机固定 360，保证两台设备坐标/碰撞完全一致（否则双方场地尺寸不同会互相错位）
            arenaSize=gameMode==='online'?360:Math.floor(Math.min(window.innerWidth*0.9,380));
            canvas=document.getElementById('battleCanvas'); canvas.width=arenaSize; canvas.height=arenaSize; ctx=canvas.getContext('2d');
            entities=[];
            roleList.forEach((role,i)=>{
                const owner = (gameMode==='dual'||gameMode==='online') ? (i===0?'player1':'player2') : ('p'+i);
                const ent = createEntity(role, owner, i, roleList.length);
                if(role.hasSpawn) ent.spawnTimer = performance.now() + 1000;
                entities.push(ent);
            });
            // 故事模式：锁定玩家实体引用（阵亡后实体会被 filter 移出数组，不能再用 entities[0] 当玩家）
            storyMe=(gameMode==='storyduel'&&entities[0])?entities[0]:null;
            storyAlly=null; storyFoe=null; battleObstacles=[]; battleLv=(gameMode==='storyduel')?curStoryLevel:-1;
            if(gameMode==='storyduel'&&curStoryLevel===1&&entities.length===3){
                // 第1关·教室2v1：刘一鸣与李嘉泽同阵营（合并 owner，互相不伤害），李晨雨为敌方
                const S=arenaSize;
                entities[1].owner=entities[0].owner;
                storyAlly=entities[1]; storyFoe=entities[2];
                entities[0].x=S*0.38; entities[0].y=S*0.86;
                entities[1].x=S*0.62; entities[1].y=S*0.86;
                entities[2].x=S*0.50; entities[2].y=S*0.225;
                battleObstacles=buildClassroomObstacles();
            }
            isManualBattle=(gameMode==='manual'||gameMode==='storyduel'||gameMode==='online'); manualEnt=null;
            if(gameMode==='online'){
                remoteEnt=null;
                const mine=entities[onlineHost?0:1], foe=entities[onlineHost?1:0];
                if(mine){
                    manualEnt=mine; mine.isManual=true;
                    mine.lastSkillTime=performance.now()-mine.role.skillInterval;
                    mine.vx=0; mine.vy=0;
                }
                if(foe){ foe.isManual=true; foe.isRemote=true; foe.netMove={x:0,y:0}; remoteEnt=foe; }
            }else if(isManualBattle && entities[0]){
                manualEnt=entities[0]; manualEnt.isManual=true;
                manualEnt.lastSkillTime=performance.now()-manualEnt.role.skillInterval;
                manualEnt.vx=0; manualEnt.vy=0;
            }
            const pcMode=isManualBattle&&IS_PC;
            const jmw=document.getElementById('joyMoveWrap'), jsw=document.getElementById('joySkillWrap'), kh=document.getElementById('kbHint');
            applyJoyLayout();
            if(jmw) jmw.style.display=pcMode?'none':(isManualBattle?'block':'none');
            if(jsw) jsw.style.display=pcMode?'none':(isManualBattle?'block':'none');
            if(kh) kh.style.display=pcMode?'block':'none';
            if(canvas) canvas.style.cursor=pcMode?'crosshair':'';
            const sb=document.getElementById('screenBattle'); if(sb) sb.style.cursor=pcMode?'crosshair':'';
            mouseAim.on=false; mouseAim.x=1; mouseAim.y=0;
            resetJoysticks();
            updateHUD();
            showScreen(document.getElementById('screenBattle'));
            const resultEl=document.getElementById('battleResult'); if(resultEl) resultEl.textContent='';
            const endBtn=document.getElementById('btnEndBattle'); if(endBtn) endBtn.style.display=(gameMode==='online'?'none':'inline-block');
            const rematchBtn=document.getElementById('btnRematch'); if(rematchBtn) rematchBtn.style.display='none';
            document.querySelectorAll('.damage-pop,.heal-pop,.dodge-pop,.frozen-fixed,.revive-pop,.phone-pop,.deathnote-fixed').forEach(e=>e.remove());
            animationId=requestAnimationFrame(gameLoop);
        }

        // ============ HUD（增量更新：实体增减才重建，血条走CSS过渡） ============
        function updateHUD(){
            const hud=document.getElementById('battleHud'); if(!hud) return;
            const alive=entities.filter(e=>e.hp>0);
            const sig=alive.map(e=>e.uid).join(',');
            if(sig!==hudSignature){
                hudSignature=sig;
                let html='';
                alive.forEach(ent=>{
                    const label=ent.isEmperor?'👑皇帝':(gameMode==='storyduel'?(ent.isManual?'你':(storyMe&&ent.owner===storyMe.owner?'队友':'敌方')):(ent.owner==='player1'?'玩家1':(ent.owner==='player2'?'玩家2':'P'+(parseInt(ent.owner.slice(1),10)+1))));
                    const hpP=Math.max(0,(ent.hp/ent.maxHp)*100);
                    const danger=hpP<30?' danger':'';
                    html+=`<div class="hud-card"><span style="font-size:16px;">${ent.role.avatar}</span> <b style="color:#fff;font-size:11px;">${rn(ent.role)}</b> <span style="color:#888;font-size:9px;">[${label}]</span><div class="hud-hp-bar"><div class="hud-hp-fill${danger}" style="width:${hpP}%;"></div></div><span style="font-size:9px;color:#f99;">${Math.ceil(Math.max(0,ent.hp))}/${ent.maxHp}</span></div>`;
                });
                hud.innerHTML=html;
                const cards=hud.querySelectorAll('.hud-card');
                alive.forEach((ent,i)=>{ ent.hudFillEl=cards[i]?cards[i].querySelector('.hud-hp-fill'):null; ent.hudTextEl=cards[i]?cards[i].lastElementChild:null; });
            }
            alive.forEach(ent=>{
                const hpP=Math.max(0,(ent.hp/ent.maxHp)*100);
                if(ent.hudFillEl){ ent.hudFillEl.style.width=hpP+'%'; ent.hudFillEl.classList.toggle('danger',hpP<30); }
                if(ent.hudTextEl) ent.hudTextEl.textContent=Math.ceil(Math.max(0,ent.hp))+'/'+ent.maxHp;
            });
        }

        // ============ 战斗辅助 ============
        function findNearestEnemy(ent){
            let nearest=null, minDist=Infinity;
            entities.forEach(e=>{
                if(e===ent || e.hp<=0 || e.owner===ent.owner) return;
                const dx=e.x-ent.x, dy=e.y-ent.y;
                const dist=Math.sqrt(dx*dx+dy*dy);
                if(dist<minDist){ minDist=dist; nearest=e; }
            });
            return nearest;
        }

        // ============ 技能释放 ============
        function fireSkill(ent, aimAngle){
            if(ent.role.skillType==='spawn_emperor'){
                if(ent.role.id!=='renqiuhong') return;
                const currentEmperors = entities.filter(e => e.isEmperor && e.owner === ent.owner && e.hp > 0);
                if(currentEmperors.length >= 5) return;
                sfxSummon();
                const emperor = createEntity(EMPEROR_ROLE, ent.owner, 0, 1, true);
                emperor.x = ent.x + (Math.random()-0.5)*30;
                emperor.y = ent.y + (Math.random()-0.5)*30;
                emperor.vx = (Math.random()-0.5)*2;
                emperor.vy = (Math.random()-0.5)*2;
                emperor.summoner = ent;
                entities.push(emperor);
                return;
            }
            if(ent.role.skillType==='spinach'){
                let a;
                if(aimAngle!==undefined) a=aimAngle;
                else { const target=findNearestEnemy(ent); if(!target) return; a=Math.atan2(target.y-ent.y,target.x-ent.x); }
                sfxShoot();
                projectiles.push({x:ent.x,y:ent.y,vx:Math.cos(a)*ent.role.projectileSpeed,vy:Math.sin(a)*ent.role.projectileSpeed,size:ent.role.projectileSize,damage:ent.role.skillDamage,owner:ent.owner,bounces:0,bounceLimit:0,color:ent.role.projectileColor,type:'spinach',born:performance.now(),shooter:ent});
                return;
            }
            if(ent.role.skillType==='belt'){
                let ab;
                if(aimAngle!==undefined) ab=aimAngle;
                else { const tg=findNearestEnemy(ent); if(!tg) return; ab=Math.atan2(tg.y-ent.y,tg.x-ent.x); }
                playSound(820,'sawtooth',0.1,0.28,110);
                setTimeout(()=>playSound(2200,'square',0.04,0.16),55);
                projectiles.push({x:ent.x,y:ent.y,vx:Math.cos(ab)*ent.role.projectileSpeed,vy:Math.sin(ab)*ent.role.projectileSpeed,size:ent.role.projectileSize,damage:ent.role.skillDamage,owner:ent.owner,bounces:0,bounceLimit:0,color:ent.role.projectileColor,type:'belt',born:performance.now(),shooter:ent});
                return;
            }
            const r=ent.role;
            let a;
            if(aimAngle!==undefined){ a=aimAngle; }
            else { const target=findNearestEnemy(ent); if(!target) return; a=Math.atan2(target.y-ent.y,target.x-ent.x); }
            if(r.skillType==='bouncing_leg'){
                sfxShoot();
                projectiles.push({x:ent.x,y:ent.y,vx:Math.cos(a)*r.projectileSpeed,vy:Math.sin(a)*r.projectileSpeed,size:r.projectileSize,damage:r.skillDamage,owner:ent.owner,bounces:0,bounceLimit:r.bounceLimit,color:r.projectileColor,type:'leg',born:performance.now(),shooter:ent});
            }else if(r.skillType==='triple_z'){
                sfxShoot(); const base=a; const spd = aimAngle!==undefined?1.0:(0.9+Math.random()*0.3);
                for(let i=0;i<3;i++){ const aa=base+(i-1)*0.35; projectiles.push({x:ent.x,y:ent.y,vx:Math.cos(aa)*r.projectileSpeed*spd,vy:Math.sin(aa)*r.projectileSpeed*spd,size:r.projectileSize,damage:r.skillDamage,owner:ent.owner,bounces:0,bounceLimit:r.bounceLimit,color:r.projectileColor,type:'z',born:performance.now(),shooter:ent}); }
            }else if(r.skillType==='sonic_wave'){
                sfxSonic();
                projectiles.push({x:ent.x,y:ent.y,vx:Math.cos(a)*r.projectileSpeed,vy:Math.sin(a)*r.projectileSpeed,size:r.projectileSize,damage:r.skillDamage,owner:ent.owner,bounces:0,bounceLimit:0,color:r.projectileColor,type:'sonic',born:performance.now(),shooter:ent,hitSet:new Set()});
            }else if(r.skillType==='random_luxury'){
                sfxShoot(); const isCar=Math.random()<0.5; const dmg=isCar?28:20; const emoji=isCar?'🚗':'⌚';
                projectiles.push({x:ent.x,y:ent.y,vx:Math.cos(a)*r.projectileSpeed,vy:Math.sin(a)*r.projectileSpeed,size:r.projectileSize,damage:dmg,owner:ent.owner,bounces:0,bounceLimit:0,color:'#ffd700',type:'luxury',emoji:emoji,born:performance.now(),shooter:ent});
            }else if(r.skillType==='freeze_computer'){
                sfxFreeze();
                projectiles.push({x:ent.x,y:ent.y,vx:Math.cos(a)*r.projectileSpeed,vy:Math.sin(a)*r.projectileSpeed,size:r.projectileSize,damage:0,owner:ent.owner,bounces:0,bounceLimit:0,color:r.projectileColor,type:'computer',born:performance.now(),shooter:ent});
            }else if(r.skillType==='beef_cake'){
                sfxShoot();
                const offset = ent.size/2 + r.projectileSize/2 + 5;
                const startX = ent.x + Math.cos(a) * offset;
                const startY = ent.y + Math.sin(a) * offset;
                projectiles.push({
                    x:startX, y:startY,
                    vx:Math.cos(a)*r.projectileSpeed,
                    vy:Math.sin(a)*r.projectileSpeed,
                    size:r.projectileSize, damage:r.skillDamage,
                    owner:ent.owner, bounces:0, bounceLimit:r.bounceLimit,
                    color:r.projectileColor, type:'beef',
                    born:performance.now(), shooter:ent,
                    hitCooldowns: new Map(), healedSelf: false
                });
            }else if(r.skillType==='popcorn_chicken'){
                sfxShoot();
                projectiles.push({x:ent.x,y:ent.y,vx:Math.cos(a)*r.projectileSpeed,vy:Math.sin(a)*r.projectileSpeed,size:r.projectileSize,damage:r.skillDamage,owner:ent.owner,bounces:0,bounceLimit:0,color:r.projectileColor,type:'popcorn',born:performance.now(),shooter:ent});
            }
        }

        // ============ 副技能（王艳：叫家长） ============
        function spawnSmoke(x,y){ const puffs=[]; for(let i=0;i<6;i++){ const a=Math.random()*Math.PI*2, d=Math.random()*10; puffs.push({dx:Math.cos(a)*d,dy:Math.sin(a)*d,r:9+Math.random()*10}); } smokes.push({x,y,born:performance.now(),puffs}); }
        function fireSecondSkill(ent){
            if(ent.role.secondType==='call_parents'){
                const aliveParents=entities.filter(e=>e.isParent&&e.hp>0);
                if(aliveParents.length>=4) return;
                sfxPhone();
                spawnFloatPop(ent.x,ent.y-24,'📱','phone-pop'); // 掏出手机
                const count=Math.min(2,4-aliveParents.length);
                const spots=[];
                for(let i=0;i<count;i++){
                    const sp={x:30+Math.random()*(arenaSize-60), y:30+Math.random()*(arenaSize-60), pr:PARENT_ROLES[(aliveParents.length+i)%2]};
                    spots.push(sp); spawnSmoke(sp.x,sp.y); // 烟雾先在家长位置凝聚
                }
                setTimeout(()=>{
                    if(!battleActive) return;
                    spots.forEach(sp=>{
                        const p=createEntity(sp.pr,ent.owner,0,1,true);
                        p.x=sp.x; p.y=sp.y;
                        p.vx=(Math.random()-0.5)*2; p.vy=(Math.random()-0.5)*2;
                        p.isParent=true; p.mother=ent;
                        entities.push(p);
                    });
                    sfxSmoke(); // 0.35秒后烟雾散开，家长现身
                },350);
            }
        }

        // ============ 粒子与浮动文字 ============
        function spawnParticles(x,y,color,n){ for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2; particles.push({x,y,vx:Math.cos(a)*(1+Math.random()*3),vy:Math.sin(a)*(1+Math.random()*3),life:200+Math.random()*300,color,size:2+Math.random()*4}); } }
        function spawnFloatPop(x,y,text,className){
            const pop=document.createElement('div'); pop.className=className; pop.textContent=text;
            const rect=canvas.getBoundingClientRect(); pop.style.left=(rect.left+x/(arenaSize/rect.width)-18)+'px'; pop.style.top=(rect.top+y/(arenaSize/rect.height)-12)+'px'; pop.style.position='fixed';
            document.body.appendChild(pop); setTimeout(()=>pop.remove(),1000);
        }
        function spawnDamagePop(x,y,dmg){ spawnFloatPop(x,y,'-'+dmg,'damage-pop'); }
        function spawnHealPop(x,y,val){ spawnFloatPop(x,y,'+'+val,'heal-pop'); }
        function spawnDodgePop(x,y){ spawnFloatPop(x,y,'💨闪避','dodge-pop'); }
        function spawnRevivePop(x,y){ spawnFloatPop(x,y,'✨复活','revive-pop'); }

        // ============ 李晨雨死亡笔记 ============
        function noteCheck(tgt, src){
            let atk=src;
            if(atk&&atk.isEmperor) atk=atk.summoner;   // 皇帝分身攻击归因到召唤者
            if(!atk||atk===tgt||atk.hp<=0||tgt.role.id!=='lichenyu'||tgt.hp<=0||tgt.hp*2>=tgt.maxHp) return;
            if(tgt.noteUntil && performance.now()<tgt.noteUntil) return;   // 记笔记动画期间不再叠加
            if(Math.random()>=0.2) return;
            tgt.noteUntil=performance.now()+1600;
            deathNote(tgt, atk);
        }
        function deathNote(tgt, src){
            const nm=rn(src.role);   // 记下攻击者的名字（屏蔽真名时自动用代号）
            const nb=document.createElement('div'); nb.className='deathnote-fixed';
            nb.innerHTML='<div class="dn-book">📓<div class="dn-pen">🖊️</div></div><div class="dn-name"></div>';
            const rect=canvas.getBoundingClientRect();
            nb.style.left=(rect.left+tgt.x/(arenaSize/rect.width))+'px';
            nb.style.top=(rect.top+tgt.y/(arenaSize/rect.height)-tgt.size/2-18)+'px';
            document.body.appendChild(nb);
            sfxSonic(); playSound(3200,'triangle',0.05,0.3,1800);
            const nameEl=nb.querySelector('.dn-name');
            let i=0; const tmr=setInterval(()=>{
                if(!nb.parentNode){ clearInterval(tmr); return; }   // 中途退场保险
                i++; nameEl.textContent=nm.slice(0,i); playSound(2400+i*120,'sine',0.03,0.05);
                if(i>=nm.length){ clearInterval(tmr);
                    nb.classList.add('dn-hit');
                    if(src.hp>0){ src.hp-=100; src.flashTimer=150; sfxHit(); spawnDamagePop(src.x,src.y,100); spawnParticles(src.x,src.y,'#ff2222',12); }
                    setTimeout(()=>{ if(nb.parentNode) nb.remove(); },700);
                }
            },90);
            setTimeout(()=>{ clearInterval(tmr); if(nb.parentNode) nb.remove(); },3200);
        }

        // ============ 逻辑更新 ============
        let _lastUpdateTs=0;
        function update(ts){
            // 按真实帧间隔归一化，避免 120Hz 屏幕上手动移动速度翻倍（联机两端口径一致）
            const dt=_lastUpdateTs?Math.min(3,Math.max(0.25,(ts-_lastUpdateTs)/16.6667)):1;
            _lastUpdateTs=ts;
            const m=15;
            // 分身逻辑
            for(let i=entities.length-1; i>=0; i--){
                const e = entities[i];
                if(e.role.hasSpawn && e.spawnTimer && ts >= e.spawnTimer && e.hp > 0){
                    e.spawnTimer = 0; // 防止重复
                    const spawnRoles = e.role.spawnRoles;
                    if(spawnRoles){
                        spawnRoles.forEach(sr => {
                            const child = createEntity(sr, e.owner, 0, 1, true);
                            child.x = e.x + (Math.random()-0.5)*40;
                            child.y = e.y + (Math.random()-0.5)*40;
                            child.vx = (Math.random()-0.5)*2;
                            child.vy = (Math.random()-0.5)*2;
                            entities.push(child);
                        });
                    }
                }
            }
            // 皇帝死亡处理
            for (let i = entities.length-1; i >= 0; i--) {
                const e = entities[i];
                if (e.isEmperor && e.summoner) {
                    if (!entities.includes(e.summoner) || e.summoner.hp <= 0) e.hp = 0;
                }
            }
            entities.forEach(e=>{
                if(e.hp<=0) return;
                const frozen = ts < e.frozenUntil;
                if(!frozen){
                    if(e.frozenLabelEl){
                        e.frozenLabelEl.classList.remove('frozen-visible');
                        const el = e.frozenLabelEl;
                        setTimeout(()=>{ if(el.parentNode) el.remove(); }, 300);
                        e.frozenLabelEl = null;
                    }
                    if(e.isManual && !(e.role.id==='liukun' && e.charging)){
                        const mv=(e.isRemote&&e.netMove)?e.netMove:joyMove;
                        e.vx=mv.x*2.6*dt; e.vy=mv.y*2.6*dt;
                    }
                    e.x+=e.vx; e.y+=e.vy; let b=false;
                    if(e.role.id==='liukun'){
                        if(e.charging && (e.charging.hp<=0 || !entities.includes(e.charging))) e.charging=null;
                        if(!e.charging && ts>=e.chargeTimer){
                            const tgt=findNearestEnemy(e);
                            e.chargeTimer=ts+10000;
                            if(tgt){ e.charging=tgt; spawnFloatPop(e.x,e.y-24,'💢','dodge-pop'); playSound(180,'sawtooth',0.2,0.12,90); }
                        }
                        if(e.charging){
                            const t=e.charging, cdx=t.x-e.x, cdy=t.y-e.y, cd=Math.sqrt(cdx*cdx+cdy*cdy)||1;
                            if(cd<(e.size+t.size)/2+2){
                                t.hp-=30; t.flashTimer=150; sfxHit(); spawnDamagePop(t.x,t.y,30); spawnParticles(t.x,t.y,'#ff4444',10); noteCheck(t, e);
                                e.charging=null; e.liukunAtkUntil=ts+1000;
                                e.vx=-cdx/cd*2; e.vy=-cdy/cd*2;
                            }else{ e.vx=cdx/cd*3.6; e.vy=cdy/cd*3.6; }
                        }
                    }
                    if(e.x-e.size/2<m){ e.x=m+e.size/2; if(e.isManual&&!e.charging)e.vx=0; else{ e.vx=Math.abs(e.vx); b=true; } }
                    if(e.x+e.size/2>arenaSize-m){ e.x=arenaSize-m-e.size/2; if(e.isManual&&!e.charging)e.vx=0; else{ e.vx=-Math.abs(e.vx); b=true; } }
                    if(e.y-e.size/2<m){ e.y=m+e.size/2; if(e.isManual&&!e.charging)e.vy=0; else{ e.vy=Math.abs(e.vy); b=true; } }
                    if(e.y+e.size/2>arenaSize-m){ e.y=arenaSize-m-e.size/2; if(e.isManual&&!e.charging)e.vy=0; else{ e.vy=-Math.abs(e.vy); b=true; } }
                    // 教室障碍（课桌/讲台）：人与边界一样走不过去
                    if(battleObstacles.length){
                        for(const o of battleObstacles){
                            const ox=Math.max(o.x,Math.min(e.x,o.x+o.w)), oy=Math.max(o.y,Math.min(e.y,o.y+o.h));
                            let dx2=e.x-ox, dy2=e.y-oy, d2=Math.sqrt(dx2*dx2+dy2*dy2); const R=e.size/2;
                            if(d2>=R) continue;
                            if(d2<0.01){ dx2=0; dy2=-1; d2=1; }
                            const nx2=dx2/d2, ny2=dy2/d2;
                            e.x=ox+nx2*R; e.y=oy+ny2*R;
                            const dot=e.vx*nx2+e.vy*ny2;
                            if(e.isManual&&!e.charging){ if(dot<0){ e.vx-=dot*nx2; e.vy-=dot*ny2; } }
                            else if(dot<0){ e.vx-=2*dot*nx2; e.vy-=2*dot*ny2; b=true; }
                        }
                    }
                    if(b) sfxBounce();
                }
                if(e.flashTimer>0) e.flashTimer-=16;
                if(frozen){
                    if(!e.frozenLabelEl){
                        const el = document.createElement('div');
                        el.className = 'frozen-fixed';
                        el.textContent = '⏳ 时停';
                        document.body.appendChild(el);
                        requestAnimationFrame(()=>{ el.classList.add('frozen-visible'); });
                        e.frozenLabelEl = el;
                    }
                    const rect = canvas.getBoundingClientRect();
                    const scaleX = arenaSize / rect.width;
                    const scaleY = arenaSize / rect.height;
                    const screenX = rect.left + (e.x / scaleX);
                    const screenY = rect.top + (e.y / scaleY) - e.size/2 - 20;
                    if(e.frozenLabelEl){
                        e.frozenLabelEl.style.left = screenX + 'px';
                        e.frozenLabelEl.style.top = screenY + 'px';
                    }
                    if(!e.lastFrozenTick) e.lastFrozenTick=ts;
                    if(ts-e.lastFrozenTick>=1000){
                        e.lastFrozenTick=ts; e.hp-=18; sfxHit();
                        spawnDamagePop(e.x,e.y,18);
                        noteCheck(e, e.frozenBy);
                        if(e.hp<=0) e.hp=0;
                    }
                }else{
                    e.lastFrozenTick=0;
                    if(ts-e.lastSkillTime>=e.role.skillInterval && !e.isEmperor && !e.isManual){
                        e.lastSkillTime=ts;
                        fireSkill(e);
                    }
                    if(e.role.secondType && ts-e.lastSecondTime>=e.role.secondInterval){
                        e.lastSecondTime=ts;
                        fireSecondSkill(e);
                    }
                }
            });
            if(isManualBattle && manualEnt && manualEnt.hp>0){
                updateSkillCooldown(ts);
            }
            for(let i=0;i<entities.length;i++){
                const a=entities[i]; if(a.hp<=0) continue;
                for(let j=i+1;j<entities.length;j++){
                    const b=entities[j]; if(b.hp<=0 || a.owner===b.owner) continue;
                    const dx=b.x-a.x, dy=b.y-a.y, dist=Math.sqrt(dx*dx+dy*dy), min=(a.size+b.size)/2;
                    if(dist<=0.01){ b.x+=(Math.random()-0.5)*2; b.y+=(Math.random()-0.5)*2; continue; } // 完全重合时微扰分离，防止卡死
                    if(dist<min && !(ts<a.frozenUntil||ts<b.frozenUntil)){
                        if(a.isEmperor && !b.isEmperor && ts>=b.invincibleUntil){ b.hp -= 15; b.flashTimer=150; sfxHit(); spawnDamagePop(b.x,b.y,15); noteCheck(b, a); }
                        if(b.isEmperor && !a.isEmperor && ts>=a.invincibleUntil){ a.hp -= 15; a.flashTimer=150; sfxHit(); spawnDamagePop(a.x,a.y,15); noteCheck(a, b); }
                        if(a.isParent && b.role.faction==='student' && ts>=a.parentAtkUntil){ a.parentAtkUntil=ts+800; b.hp-=10; b.flashTimer=150; sfxHit(); spawnDamagePop(b.x,b.y,10); noteCheck(b, a); }
                        if(b.isParent && a.role.faction==='student' && ts>=b.parentAtkUntil){ b.parentAtkUntil=ts+800; a.hp-=10; a.flashTimer=150; sfxHit(); spawnDamagePop(a.x,a.y,10); noteCheck(a, b); }
                        if(a.role.id==='liukun' && !a.charging && ts>=a.liukunAtkUntil){ a.liukunAtkUntil=ts+800; b.hp-=10; b.flashTimer=150; sfxHit(); spawnDamagePop(b.x,b.y,10); noteCheck(b, a); }
                        if(b.role.id==='liukun' && !b.charging && ts>=b.liukunAtkUntil){ b.liukunAtkUntil=ts+800; a.hp-=10; a.flashTimer=150; sfxHit(); spawnDamagePop(a.x,a.y,10); noteCheck(a, b); }
                        const nx=dx/dist, ny=dy/dist, over=min-dist;
                        if(a.role.id==='liukun'&&a.charging){ b.x+=nx*over; b.y+=ny*over; b.vx+=nx*2.5; b.vy+=ny*2.5; }
                        else if(b.role.id==='liukun'&&b.charging){ a.x-=nx*over; a.y-=ny*over; a.vx-=nx*2.5; a.vy-=ny*2.5; }
                        else{
                            a.x-=nx*over/2; a.y-=ny*over/2;
                            b.x+=nx*over/2; b.y+=ny*over/2;
                            const rv=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
                            if(rv>0){ a.vx-=rv*nx; a.vy-=rv*ny; b.vx+=rv*nx; b.vy+=rv*ny; }
                        }
                        sfxBounce();
                    }
                }
            }
            for(let i=projectiles.length-1;i>=0;i--){
                const p=projectiles[i]; p.x+=p.vx; p.y+=p.vy; let edge=false;
                if(p.x-p.size/2<0){ p.x=p.size/2; p.vx=Math.abs(p.vx); edge=true; }
                if(p.x+p.size/2>arenaSize){ p.x=arenaSize-p.size/2; p.vx=-Math.abs(p.vx); edge=true; }
                if(p.y-p.size/2<0){ p.y=p.size/2; p.vy=Math.abs(p.vy); edge=true; }
                if(p.y+p.size/2>arenaSize){ p.y=arenaSize-p.size/2; p.vy=-Math.abs(p.vy); edge=true; }
                if(edge){
                    if(p.bounceLimit>0 && p.bounces<p.bounceLimit){ p.bounces++; sfxBounce(); }
                    else { spawnParticles(p.x,p.y,p.color,3); projectiles.splice(i,1); continue; }
                }
                // 教室障碍（课桌/讲台）：弹道碰到与撞墙同规则（可反弹的反弹，不可反弹的消失）
                if(battleObstacles.length){
                    let hitObs=false;
                    for(const o of battleObstacles){
                        const hw=o.w/2+p.size/2, hh=o.h/2+p.size/2, ocx=o.x+o.w/2, ocy=o.y+o.h/2;
                        const dx2=p.x-ocx, dy2=p.y-ocy;
                        if(Math.abs(dx2)<hw && Math.abs(dy2)<hh){
                            const ox2=hw-Math.abs(dx2), oy2=hh-Math.abs(dy2);
                            if(ox2<oy2){ p.x=ocx+(dx2<0?-hw:hw); p.vx=(dx2<0?-Math.abs(p.vx):Math.abs(p.vx)); }
                            else{ p.y=ocy+(dy2<0?-hh:hh); p.vy=(dy2<0?-Math.abs(p.vy):Math.abs(p.vy)); }
                            hitObs=true; break;
                        }
                    }
                    if(hitObs){
                        if(p.bounceLimit>0 && p.bounces<p.bounceLimit){ p.bounces++; sfxBounce(); }
                        else { spawnParticles(p.x,p.y,p.color,3); projectiles.splice(i,1); continue; }
                    }
                }
                const now = performance.now();
                let shouldRemove = false;
                for(const tgt of entities){
                    if(tgt.hp<=0) continue;
                    if(now < tgt.invincibleUntil && tgt.role.hasRevive) continue;
                    const dx=p.x-tgt.x, dy=p.y-tgt.y, dist=Math.sqrt(dx*dx+dy*dy);
                    if(dist<(p.size+tgt.size)/2){
                        if(p.type==='beef'){
                            if(tgt === p.shooter && now - p.born < 100) continue;
                            if(tgt === p.shooter){
                                if(!p.healedSelf){
                                    tgt.hp = Math.min(tgt.maxHp, tgt.hp + 30);
                                    sfxHeal(); spawnHealPop(tgt.x, tgt.y, 30);
                                    p.healedSelf = true;
                                }
                            } else if(tgt.owner !== p.owner){
                                const lastHit = p.hitCooldowns.get(tgt) || 0;
                                if(now - lastHit > 300){
                                    if(tgt.role.id === 'renqiuhong' && Math.random() < 0.5){
                                        sfxDodge(); spawnDodgePop(tgt.x, tgt.y);
                                    } else {
                                        tgt.hp -= p.damage;
                                        tgt.flashTimer=150;
                                        sfxHit(); spawnDamagePop(tgt.x,tgt.y,p.damage);
                                        noteCheck(tgt, p.shooter);
                                    }
                                    p.hitCooldowns.set(tgt, now);
                                }
                            }
                        } else if(p.type==='spinach' || p.type==='popcorn'){
                            if(tgt.owner !== p.owner){
                                tgt.hp -= p.damage;
                                tgt.flashTimer=150;
                                sfxHit(); spawnDamagePop(tgt.x,tgt.y,p.damage);
                                noteCheck(tgt, p.shooter);
                                spawnParticles(p.x,p.y,p.color,5);
                                shouldRemove = true; break;
                            }
                        } else {
                            if(tgt.owner !== p.owner){
                                if(p.type==='computer'){
                                    tgt.frozenUntil=performance.now()+3000; tgt.frozenBy=p.shooter; sfxFreeze();
                                    spawnParticles(p.x,p.y,'#ff4444',8);
                                    shouldRemove = true; break;
                                }
                                if(p.type==='sonic'){
                                    if(!p.hitSet.has(tgt)){
                                        p.hitSet.add(tgt);
                                        if(tgt.role.id === 'renqiuhong' && Math.random() < 0.5){
                                            sfxDodge(); spawnDodgePop(tgt.x, tgt.y);
                                        } else {
                                            tgt.hp -= p.damage;
                                            tgt.flashTimer=150;
                                            sfxHit(); spawnDamagePop(tgt.x,tgt.y,p.damage);
                                            noteCheck(tgt, p.shooter);
                                        }
                                        spawnParticles(p.x,p.y,'#ffffff',6);
                                    }
                                    // 声波穿透：不删除弹道，继续飞行打击下一个目标
                                } else {
                                    if(tgt.role.id === 'renqiuhong' && Math.random() < 0.5){
                                        sfxDodge(); spawnDodgePop(tgt.x, tgt.y);
                                    } else {
                                        tgt.hp -= p.damage;
                                        tgt.flashTimer=150;
                                        sfxHit(); spawnDamagePop(tgt.x,tgt.y,p.damage);
                                        noteCheck(tgt, p.shooter);
                                    }
                                    spawnParticles(p.x,p.y,'#ff4444',8);
                                    shouldRemove = true; break;
                                }
                            }
                        }
                    }
                }
                if(shouldRemove){
                    projectiles.splice(i,1);
                }else if(now-p.born>15000){
                    projectiles.splice(i,1);
                }
            }
            // 刘焜：食物生成（每5秒5个，上限20）与进食回血变大
            if(entities.some(e=>e.role.id==='liukun'&&e.hp>0) && ts>=foodTimer){
                foodTimer=ts+5000;
                const FOOD_EMOJI=['🍎','🍔','🍗','🍰','🍕','🍩','🥟'];
                for(let i=0;i<5&&foods.length<20;i++){ foods.push({x:25+Math.random()*(arenaSize-50), y:25+Math.random()*(arenaSize-50), emoji:FOOD_EMOJI[Math.floor(Math.random()*FOOD_EMOJI.length)]}); }
            }
            for(let i=foods.length-1;i>=0;i--){
                const f=foods[i]; let eaten=false;
                for(const e of entities){
                    if(e.hp<=0||e.role.id!=='liukun') continue;
                    const fdx=e.x-f.x, fdy=e.y-f.y;
                    if(Math.sqrt(fdx*fdx+fdy*fdy)<e.size/2+8){
                        eaten=true;
                        e.hp=Math.min(e.maxHp,e.hp+5);
                        e.size=Math.min(e.size+1.5,64);
                        sfxHeal(); spawnHealPop(e.x,e.y,5); spawnParticles(f.x,f.y,'#90ee90',5);
                        break;
                    }
                }
                if(eaten) foods.splice(i,1);
            }
            for(let i=particles.length-1;i>=0;i--){ particles[i].x+=particles[i].vx; particles[i].y+=particles[i].vy; particles[i].life-=16; if(particles[i].life<=0) particles.splice(i,1); }
            // 复活逻辑
            for(let i=entities.length-1; i>=0; i--){
                const e = entities[i];
                if(e.hp<=0 && e.role.hasRevive && !e.revived && !e.isEmperor){
                    e.hp = e.maxHp;
                    e.revived = true;
                    e.invincibleUntil = performance.now() + 1000;
                    sfxRevive();
                    spawnRevivePop(e.x, e.y);
                }
            }
            entities = entities.filter(e=>{
                if(e.hp<=0 && e.frozenLabelEl){ e.frozenLabelEl.remove(); }
                return e.hp>0;
            });
        }

        // ============ 渲染 ============
        function rrPath(x,y,w,h,r){ r=Math.min(r,w/2,h/2); ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
        function drawBedroom(){
            const S=arenaSize;
            // 木地板（俯视整层）+ 板缝
            const fg=ctx.createLinearGradient(0,0,0,S); fg.addColorStop(0,'#6b4a2e'); fg.addColorStop(1,'#54381f');
            ctx.fillStyle=fg; ctx.fillRect(0,0,S,S);
            ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=1.5;
            for(let y=S*0.033;y<S;y+=S*0.035){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(S,y); ctx.stroke(); }
            // 窗光斜铺在地板上
            const pool=ctx.createLinearGradient(0,S*0.05,0,S*0.62); pool.addColorStop(0,'rgba(255,228,150,0.30)'); pool.addColorStop(1,'rgba(255,228,150,0)');
            ctx.fillStyle=pool; ctx.beginPath(); ctx.moveTo(S*0.72,S*0.05); ctx.lineTo(S*0.92,S*0.05); ctx.lineTo(S*1.0,S*0.62); ctx.lineTo(S*0.50,S*0.62); ctx.closePath(); ctx.fill();
            // 圆地毯
            ctx.fillStyle='rgba(122,90,158,0.9)'; ctx.beginPath(); ctx.arc(S*0.37,S*0.60,S*0.155,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle='rgba(255,255,255,0.14)'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(S*0.37,S*0.60,S*0.115,0,Math.PI*2); ctx.stroke();
            ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.arc(S*0.37,S*0.60,S*0.075,0,Math.PI*2); ctx.stroke();
            // 床（俯视：床头贴上墙，双枕+蓝被）
            const bx=S*0.57, by=S*0.13, bw=S*0.33, bh=S*0.47;
            ctx.fillStyle='#6d4a28'; rrPath(bx,by,bw,bh,8); ctx.fill();
            ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=2; rrPath(bx,by,bw,bh,8); ctx.stroke();
            ctx.fillStyle='#7a5230'; rrPath(bx+2,by+2,bw-4,bh*0.08,5); ctx.fill();
            ctx.fillStyle='#f0e8d2'; rrPath(bx+bw*0.04,by+bh*0.11,bw*0.92,bh*0.85,6); ctx.fill();
            ctx.fillStyle='#ffffff'; rrPath(bx+bw*0.07,by+bh*0.14,bw*0.38,bh*0.15,7); ctx.fill();
            ctx.fillStyle='#f2ede0'; rrPath(bx+bw*0.55,by+bh*0.14,bw*0.38,bh*0.15,7); ctx.fill();
            const bl=ctx.createLinearGradient(0,by+bh*0.36,0,by+bh*0.96); bl.addColorStop(0,'#5a8fd6'); bl.addColorStop(1,'#3a63a8');
            ctx.fillStyle=bl; rrPath(bx+bw*0.04,by+bh*0.36,bw*0.92,bh*0.60,6); ctx.fill();
            ctx.strokeStyle='rgba(255,255,255,0.20)'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.moveTo(bx+bw*0.06,by+bh*0.50); ctx.lineTo(bx+bw*0.94,by+bh*0.50); ctx.stroke();
            ctx.strokeStyle='rgba(0,0,0,0.14)';
            ctx.beginPath(); ctx.moveTo(bx+bw*0.06,by+bh*0.78); ctx.lineTo(bx+bw*0.94,by+bh*0.78); ctx.stroke();
            // 床头柜+闹钟
            ctx.fillStyle='#5d3d20'; rrPath(S*0.915,S*0.15,S*0.068,S*0.12,4); ctx.fill();
            ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font=Math.round(S*0.05)+'px sans-serif';
            ctx.fillText('⏰',S*0.949,S*0.21);
            ctx.fillText('🥿🥿',S*0.68,S*0.72);
            // 书桌+电脑+椅子（左下）
            ctx.fillStyle='#6d4a28'; rrPath(S*0.05,S*0.66,S*0.24,S*0.26,5); ctx.fill();
            ctx.fillStyle='#0d0f1c'; rrPath(S*0.075,S*0.685,S*0.125,S*0.09,3); ctx.fill();
            ctx.save(); ctx.shadowColor='rgba(90,140,255,0.7)'; ctx.shadowBlur=12; ctx.fillStyle='rgba(90,140,255,0.30)'; rrPath(S*0.079,S*0.689,S*0.117,S*0.082,2); ctx.fill(); ctx.restore();
            ctx.fillStyle='#2c2f3e'; rrPath(S*0.079,S*0.81,S*0.115,S*0.032,2); ctx.fill();
            ctx.fillStyle='#3a4468'; ctx.beginPath(); ctx.arc(S*0.26,S*0.76,S*0.052,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle='#2c3550'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(S*0.26,S*0.76,S*0.052,0,Math.PI*2); ctx.stroke();
            // 顶部墙带
            ctx.fillStyle='#3c2a17'; ctx.fillRect(0,0,S,S*0.065);
            ctx.fillStyle='rgba(255,255,255,0.05)'; ctx.fillRect(0,0,S,S*0.02);
            ctx.fillStyle='#241708'; ctx.fillRect(0,S*0.065-2.5,S,2.5);
            // 窗（墙带上的亮口）
            ctx.save(); ctx.shadowColor='rgba(255,210,120,0.9)'; ctx.shadowBlur=16;
            ctx.fillStyle='#ffe9ae'; ctx.fillRect(S*0.74,1,S*0.16,S*0.065-3); ctx.restore();
            ctx.fillStyle='rgba(140,100,40,0.55)'; ctx.fillRect(S*0.817,1,2.5,S*0.065-3);
            // 门（敞开：亮口+光带+门板斜进屋内）
            ctx.fillStyle='#ffe2a0'; ctx.fillRect(S*0.07,1,S*0.16,S*0.065-3);
            const dh=ctx.createLinearGradient(S*0.07,S*0.065,S*0.05,S*0.46); dh.addColorStop(0,'rgba(255,216,140,0.40)'); dh.addColorStop(1,'rgba(255,216,140,0)');
            ctx.fillStyle=dh; ctx.beginPath(); ctx.moveTo(S*0.07,S*0.065); ctx.lineTo(S*0.21,S*0.065); ctx.lineTo(S*0.30,S*0.46); ctx.lineTo(S*0.03,S*0.46); ctx.closePath(); ctx.fill();
            ctx.save(); ctx.translate(S*0.07,S*0.033); ctx.rotate(104*Math.PI/180);
            ctx.fillStyle='#7a5230'; ctx.fillRect(0,-2,S*0.16,4); ctx.strokeStyle='#46301b'; ctx.lineWidth=1.5; ctx.strokeRect(0,-2,S*0.16,4);
            ctx.fillStyle='#ffeab0'; ctx.beginPath(); ctx.arc(S*0.155,0,2.5,0,Math.PI*2); ctx.fill(); ctx.restore();
            // 暗角（俯视纵深）
            const vg=ctx.createRadialGradient(S/2,S*0.42,S*0.30,S/2,S*0.42,S*0.78); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.42)');
            ctx.fillStyle=vg; ctx.fillRect(0,0,S,S);
        }
        // 第1关·教室：障碍矩形（讲台 + 6张课桌），渲染与碰撞完全一致
        function buildClassroomObstacles(){
            const S=arenaSize;
            return [
                {x:S*0.34, y:S*0.075, w:S*0.32, h:S*0.085},   // 讲台
                {x:S*0.13, y:S*0.28, w:S*0.25, h:S*0.085},    // 课桌·左上
                {x:S*0.62, y:S*0.28, w:S*0.25, h:S*0.085},    // 课桌·右上
                {x:S*0.13, y:S*0.47, w:S*0.25, h:S*0.085},    // 课桌·左中
                {x:S*0.62, y:S*0.47, w:S*0.25, h:S*0.085},    // 课桌·右中
                {x:S*0.13, y:S*0.66, w:S*0.25, h:S*0.085},    // 课桌·左下
                {x:S*0.62, y:S*0.66, w:S*0.25, h:S*0.085}     // 课桌·右下
            ];
        }
        function drawClassroom(){
            const S=arenaSize;
            // 浅木地板 + 板缝
            const fg=ctx.createLinearGradient(0,0,0,S); fg.addColorStop(0,'#d2c4a0'); fg.addColorStop(1,'#b5a67e');
            ctx.fillStyle=fg; ctx.fillRect(0,0,S,S);
            ctx.strokeStyle='rgba(90,70,40,0.16)'; ctx.lineWidth=1;
            for(let x=S*0.05;x<S;x+=S*0.075){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,S); ctx.stroke(); }
            ctx.strokeStyle='rgba(255,255,255,0.10)';
            for(let y=S*0.05;y<S;y+=S*0.09){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(S,y); ctx.stroke(); }
            // 顶部墙带 + 黑板（粉笔痕）
            ctx.fillStyle='#caa675'; ctx.fillRect(0,0,S,S*0.055);
            ctx.fillStyle='#234d31'; ctx.fillRect(S*0.10,S*0.008,S*0.80,S*0.038);
            ctx.strokeStyle='#7a5a33'; ctx.lineWidth=2; ctx.strokeRect(S*0.10,S*0.008,S*0.80,S*0.038);
            ctx.strokeStyle='rgba(255,255,255,0.75)'; ctx.lineWidth=1.2;
            ctx.beginPath(); ctx.moveTo(S*0.16,S*0.022); ctx.lineTo(S*0.30,S*0.020); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(S*0.16,S*0.036); ctx.lineTo(S*0.26,S*0.034); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(S*0.60,S*0.024); ctx.lineTo(S*0.74,S*0.026); ctx.stroke();
            // 窗（墙带亮口）+ 窗光斜铺
            ctx.save(); ctx.shadowColor='rgba(255,240,190,0.85)'; ctx.shadowBlur=13;
            ctx.fillStyle='#fff2c4'; ctx.fillRect(S*0.045,1,S*0.10,S*0.04); ctx.restore();
            const pool=ctx.createLinearGradient(S*0.10,0,S*0.36,S*0.62);
            pool.addColorStop(0,'rgba(255,240,190,0.34)'); pool.addColorStop(1,'rgba(255,240,190,0)');
            ctx.fillStyle=pool; ctx.beginPath(); ctx.moveTo(S*0.045,0); ctx.lineTo(S*0.145,0); ctx.lineTo(S*0.40,S*0.60); ctx.lineTo(S*0.16,S*0.60); ctx.closePath(); ctx.fill();
            // 讲台 + 课桌（与碰撞矩形一致）
            battleObstacles.forEach((o,i)=>{
                const isPod=(i===0);
                ctx.save();
                ctx.shadowColor='rgba(0,0,0,0.35)'; ctx.shadowBlur=6; ctx.shadowOffsetY=3;
                const wg=ctx.createLinearGradient(0,o.y,0,o.y+o.h);
                wg.addColorStop(0,isPod?'#c89052':'#c09055'); wg.addColorStop(1,isPod?'#8a5a2c':'#8a6130');
                ctx.fillStyle=wg; rrPath(o.x,o.y,o.w,o.h,isPod?5:4); ctx.fill();
                ctx.restore();
                ctx.strokeStyle='#6d4a28'; ctx.lineWidth=1.6; rrPath(o.x,o.y,o.w,o.h,isPod?5:4); ctx.stroke();
                ctx.fillStyle='rgba(255,255,255,0.16)'; ctx.fillRect(o.x+2,o.y+2,o.w-4,2.5);
                if(isPod){ ctx.fillStyle='rgba(255,255,255,0.22)'; ctx.fillRect(o.x+o.w*0.08,o.y+o.h*0.30,o.w*0.30,o.h*0.34); }
            });
            // 桌面杂物
            ctx.font=Math.round(S*0.028)+'px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText('📖',S*0.30,S*0.320); ctx.fillText('✏️',S*0.80,S*0.510); ctx.fillText('📚',S*0.25,S*0.700);
            // 暗角
            const vg=ctx.createRadialGradient(S/2,S*0.45,S*0.32,S/2,S*0.45,S*0.80); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.30)');
            ctx.fillStyle=vg; ctx.fillRect(0,0,S,S);
        }
        function render(){
            ctx.clearRect(0,0,arenaSize,arenaSize);
            if(gameMode==='storyduel'){ battleLv===1?drawClassroom():drawBedroom(); }
            else{
            const bg=ctx.createRadialGradient(arenaSize/2,arenaSize/2,0,arenaSize/2,arenaSize/2,arenaSize*0.8);
            bg.addColorStop(0,'#2a2a40'); bg.addColorStop(1,'#141420'); ctx.fillStyle=bg; ctx.fillRect(0,0,arenaSize,arenaSize);
            ctx.strokeStyle='rgba(255,255,255,0.04)'; for(let i=arenaSize/8;i<arenaSize;i+=arenaSize/8){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,arenaSize); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(arenaSize,i); ctx.stroke(); }
            ctx.strokeStyle='rgba(240,192,96,0.3)'; ctx.lineWidth=2.5; ctx.strokeRect(2,2,arenaSize-4,arenaSize-4);
            if(gameMode==='dual'||gameMode==='online'){ ctx.setLineDash([8,12]); ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.moveTo(0,arenaSize/2); ctx.lineTo(arenaSize,arenaSize/2); ctx.stroke(); ctx.setLineDash([]); }
            }
            projectiles.forEach(p=>{
                ctx.save();
                if(p.type==='leg'){ const s=p.size,a=Math.atan2(p.vy,p.vx); ctx.translate(p.x,p.y); ctx.rotate(a); ctx.strokeStyle=p.color; ctx.lineWidth=s*0.35; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(-s*0.3,0); ctx.lineTo(0,-s*0.5); ctx.lineTo(s*0.5,-s*0.3); ctx.stroke(); }
                else if(p.type==='belt'){
                    const s=p.size, L=s*2.35, H=s*0.58, wob=Math.sin((performance.now()-p.born)*0.022)*0.12;
                    ctx.translate(p.x,p.y); ctx.rotate(Math.atan2(p.vy,p.vx)+wob);
                    function rr(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
                    // 皮带尾端（分叉飘带）
                    ctx.strokeStyle='#4d2c13'; ctx.lineWidth=2.4; ctx.lineCap='round';
                    for(let k=-1;k<=1;k++){ ctx.beginPath(); ctx.moveTo(-L*0.42,0); ctx.lineTo(-L*0.55, k*H*0.32); ctx.stroke(); }
                    // 带身
                    const bg=ctx.createLinearGradient(0,-H/2,0,H/2); bg.addColorStop(0,'#a76a35'); bg.addColorStop(0.5,'#7c4a20'); bg.addColorStop(1,'#55300f');
                    rr(-L*0.42,-H/2,L*0.66,H,5); ctx.fillStyle=bg; ctx.fill(); ctx.strokeStyle='#3d230c'; ctx.lineWidth=1.6; ctx.stroke();
                    // 双道缝线
                    ctx.strokeStyle='rgba(255,225,180,0.35)'; ctx.lineWidth=1; ctx.setLineDash([3.5,3]);
                    [-H*0.28,H*0.28].forEach(y=>{ ctx.beginPath(); ctx.moveTo(-L*0.36,y); ctx.lineTo(L*0.2,y); ctx.stroke(); });
                    ctx.setLineDash([]);
                    // 带孔
                    ctx.fillStyle='#2a1708';
                    for(let i=0;i<3;i++){ ctx.beginPath(); ctx.arc(-L*0.18-i*H*0.42,0,1.6,0,Math.PI*2); ctx.fill(); }
                    // 金属带扣（七匹狼）
                    const bx=L*0.24, bw=H*1.15;
                    const mg=ctx.createLinearGradient(bx,-H*0.62,bx+bw,H*0.62); mg.addColorStop(0,'#f2f4fa'); mg.addColorStop(0.45,'#a9b0c2'); mg.addColorStop(0.6,'#ffffff'); mg.addColorStop(1,'#7d8499');
                    rr(bx,-H*0.62,bw,bw,4); ctx.fillStyle=mg; ctx.fill(); ctx.strokeStyle='#5d6678'; ctx.lineWidth=1.4; ctx.stroke();
                    rr(bx+bw*0.24,-H*0.36,bw*0.52,bw*0.72,2); ctx.fillStyle='#2a1708'; ctx.fill();
                    ctx.fillStyle='#e8ecf6'; ctx.fillRect(bx+bw*0.1,-2,bw*0.8,4);
                    ctx.shadowColor='rgba(0,0,0,0)';
                }
                else if(p.type==='z'){ ctx.fillStyle=p.color; ctx.font=`bold ${p.size+5}px sans-serif`; ctx.textAlign='center'; ctx.fillText('Z',p.x,p.y); }
                else if(p.type==='sonic'){ const now=performance.now()*0.004; ctx.save(); ctx.shadowColor='#ffffff'; ctx.shadowBlur=14; for(let r=0;r<3;r++){ const phase=(now+r*0.33)%1; ctx.strokeStyle='#ffffff'; ctx.globalAlpha=0.85*(1-phase); ctx.lineWidth=2.5-phase*1.5; ctx.beginPath(); ctx.arc(p.x,p.y,p.size*0.3+phase*p.size*0.95,0,Math.PI*2); ctx.stroke(); } ctx.globalAlpha=1; ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(p.x,p.y,p.size*0.24,0,Math.PI*2); ctx.fill(); ctx.restore(); }
                else if(p.type==='luxury'){ ctx.font=`${p.size+7}px sans-serif`; ctx.textAlign='center'; ctx.fillText(p.emoji||'🚗',p.x,p.y); }
                else if(p.type==='computer'){ ctx.font=`${p.size+5}px sans-serif`; ctx.textAlign='center'; ctx.fillText('💻',p.x,p.y); }
                else if(p.type==='beef'){ ctx.font=`${p.size+6}px sans-serif`; ctx.textAlign='center'; ctx.fillText('🍔',p.x,p.y); }
                else if(p.type==='spinach'){ ctx.font=`${p.size+4}px sans-serif`; ctx.textAlign='center'; ctx.fillText('🥬',p.x,p.y); }
                else if(p.type==='popcorn'){ ctx.font=`${p.size+4}px sans-serif`; ctx.textAlign='center'; ctx.fillText('🍿',p.x,p.y); }
                ctx.restore();
            });
            foods.forEach(f=>{ ctx.font='14px sans-serif'; ctx.textAlign='center'; ctx.fillText(f.emoji,f.x,f.y+5); });
            entities.forEach(e=>{
                if(e.hp<=0) return;
                ctx.save(); if(e.flashTimer>0) ctx.globalAlpha=0.7+Math.sin(e.flashTimer*0.3)*0.3;
                if(e.charging && e.charging.hp>0){
                    ctx.strokeStyle='rgba(255,60,60,0.75)'; ctx.lineWidth=2; ctx.setLineDash([6,6]);
                    ctx.beginPath(); ctx.moveTo(e.x,e.y); ctx.lineTo(e.charging.x,e.charging.y); ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.strokeStyle='#ff4444'; ctx.lineWidth=2.5;
                    ctx.beginPath(); ctx.arc(e.x,e.y,e.size/2+5+Math.sin(performance.now()*0.015)*2,0,Math.PI*2); ctx.stroke();
                }
                if(performance.now()<e.frozenUntil){
                    ctx.strokeStyle='#00ffff'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(e.x,e.y,e.size/2+4,0,Math.PI*2); ctx.stroke();
                }
                if(performance.now() < e.invincibleUntil){
                    ctx.strokeStyle='#90ee90'; ctx.lineWidth=2; ctx.setLineDash([4,4]); ctx.beginPath(); ctx.arc(e.x,e.y,e.size/2+6,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
                }
                const glow=ctx.createRadialGradient(e.x,e.y,e.size*0.3,e.x,e.y,e.size*0.85); glow.addColorStop(0,e.role.color+'50'); glow.addColorStop(1,'transparent'); ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(e.x,e.y,e.size*0.85,0,Math.PI*2); ctx.fill();
                ctx.fillStyle=e.role.color; ctx.beginPath(); ctx.arc(e.x,e.y,e.size/2,0,Math.PI*2); ctx.fill();
                ctx.fillStyle='#fff'; ctx.font=`${e.size*0.55}px sans-serif`; ctx.textAlign='center'; ctx.fillText(e.role.avatar,e.x,e.y+1);
                if(e.isManual && !e.isRemote && joySkill.active){
                    const sm=Math.hypot(joySkill.x,joySkill.y);
                    if(sm>0.15){
                        const ax=joySkill.x/sm, ay=joySkill.y/sm;
                        const rdy = performance.now()-e.lastSkillTime;
                        const ready = rdy>=e.role.skillInterval;
                        ctx.save();
                        ctx.strokeStyle = ready?e.role.color:'rgba(255,255,255,0.35)';
                        ctx.lineWidth = 2.5;
                        ctx.setLineDash([7,6]);
                        ctx.beginPath();
                        ctx.moveTo(e.x+ax*e.size/2, e.y+ay*e.size/2);
                        ctx.lineTo(e.x+ax*(e.size/2+80), e.y+ay*(e.size/2+80));
                        ctx.stroke();
                        ctx.setLineDash([]);
                        // 瞄准终点小点
                        ctx.fillStyle = ready?e.role.color:'rgba(255,255,255,0.5)';
                        ctx.beginPath(); ctx.arc(e.x+ax*(e.size/2+80), e.y+ay*(e.size/2+80), 3.5, 0, Math.PI*2); ctx.fill();
                        ctx.restore();
                    }
                }
                if(e.isManual&&!e.isRemote&&IS_PC){ const rdy=performance.now()-e.lastSkillTime, iv=e.role.skillInterval||1; if(rdy<iv){ const frac=1-rdy/iv; ctx.strokeStyle='rgba(0,0,0,0.55)'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(e.x,e.y,e.size/2+5,-Math.PI/2,-Math.PI/2+Math.PI*2*frac); ctx.stroke(); } }
                const hpW=e.size*1.1; ctx.fillStyle='#333'; ctx.fillRect(e.x-hpW/2,e.y-e.size/2-8,hpW,4);
                const hpP=Math.max(0,e.hp/e.maxHp); ctx.fillStyle=hpP>0.5?'#5cb85c':hpP>0.25?'#f0ad4e':'#e74c3c'; ctx.fillRect(e.x-hpW/2,e.y-e.size/2-8,hpW*hpP,4);
                ctx.restore();
            });
            particles.forEach(p=>{ ctx.fillStyle=p.color; ctx.globalAlpha=Math.min(1,p.life/500); ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; });
            for(let i=smokes.length-1;i>=0;i--){
                const s=smokes[i], t=(performance.now()-s.born)/400;
                if(t>=1){ smokes.splice(i,1); continue; }
                const grow=t<0.35?t/0.35:1, fade=t<0.3?1:Math.max(0,1-(t-0.3)/0.7);
                s.puffs.forEach(p=>{
                    const px=s.x+p.dx*grow*1.5, py=s.y+p.dy*grow*1.5-t*8, r=p.r*grow*1.7;
                    const g=ctx.createRadialGradient(px,py,0,px,py,r);
                    g.addColorStop(0,'rgba(208,208,216,'+(0.6*fade).toFixed(2)+')');
                    g.addColorStop(0.6,'rgba(190,190,200,'+(0.35*fade).toFixed(2)+')');
                    g.addColorStop(1,'rgba(190,190,200,0)');
                    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.fill();
                });
            }
        }

        // ============ 主循环 ============
        function gameLoop(ts){
            if(!battleActive) return;
            if(netGuest){ guestTick(ts); return; }
            animationId=requestAnimationFrame(gameLoop);
            update(ts); render(); updateHUD();
            if(gameMode==='online'&&onlineHost) onlineHostTick();
            const alive = entities.filter(e => e.hp > 0);
            const owners = new Set(alive.map(e => e.owner));
            if(gameMode==='storyduel'){
                if(battleLv===1){
                    // 第1关·教室2v1：李嘉泽(你)与刘一鸣同阵营，目标击败李晨雨
                    const me=storyMe;
                    const teamAlive=alive.filter(e=>me&&e.owner===me.owner);
                    const foeGone=!alive.some(e=>!me||e.owner!==me.owner);
                    const winAll=foeGone&&teamAlive.length>0;
                    const lose=teamAlive.length===0;
                    if(winAll||lose){
                        battleActive = false; cancelAnimationFrame(animationId); animationId = null;
                        render(); updateHUD();
                        storyDuelEnd1(winAll);
                    }
                    return;
                }
                // 故事模式：自己阵亡=失败；敌方全灭=胜利（用 storyMe 引用，玩家实体阵亡后会被移出数组）
                const me=storyMe;
                const winAll=alive.length>0 && me && me.hp>0 && alive.every(e=>e.owner===me.owner);
                const lose=!me||me.hp<=0;
                if(winAll||lose||alive.length===0){
                    battleActive = false; cancelAnimationFrame(animationId); animationId = null;
                    const ratio=winAll&&me?Math.max(0,me.hp/me.maxHp):0;
                    render(); updateHUD();
                    storyDuelEnd(winAll,ratio);
                }
                return;
            }
            if (alive.length === 0 || owners.size <= 1) {
                battleActive = false; cancelAnimationFrame(animationId); animationId = null;
                sfxWin();
                if(gameMode==='online'&&!onlineEnded) onlineHostEnd(alive);
                const endBtn = document.getElementById('btnEndBattle'); if(endBtn) endBtn.style.display='none';
                const rematchBtn = document.getElementById('btnRematch'); if(rematchBtn) rematchBtn.style.display=(gameMode==='online'?'none':'inline-block');
                const resultEl = document.getElementById('battleResult');
                if (alive.length === 0) {
                    if(resultEl) resultEl.textContent = '💀 全部阵亡！';
                    showVictory('同归于尽 💀', '💀', '#888888');
                } else {
                    const winner = alive.find(e => !e.isEmperor) || alive[0];
                    const label = winner.isEmperor ? ('皇帝(' + (winner.summoner ? rn(winner.summoner.role) : '?') + ')') : ((gameMode==='dual'||gameMode==='online') ? (winner.owner==='player1'?'玩家1':'玩家2') : rn(winner.role));
                    if(resultEl) resultEl.textContent = `🏆 ${label} 获胜！`;
                    showVictory(label+' 获胜！', winner.role.avatar, winner.role.color);
                }
                render(); updateHUD();
            }
        }

        // ============ 胜利结算（全局） ============
        function showVictory(text, avatar, color){
            const a=document.getElementById('vicAvatar'), n=document.getElementById('vicName'), c=document.getElementById('vicConfetti');
            if(a){ a.textContent=avatar; if(color){ a.style.borderColor=color; a.style.boxShadow='0 0 40px '+color+'88'; } }
            if(n) n.textContent=text;
            if(c){ c.innerHTML=''; const colors=['#f0c060','#ff6b8a','#66ccff','#90ee90','#c8a0ff']; for(let i=0;i<16;i++){ const s=document.createElement('span'); s.className='confetti'; s.style.left=(Math.random()*100)+'%'; s.style.background=colors[i%colors.length]; s.style.animationDelay=(Math.random()*0.8)+'s'; s.style.animationDuration=(1.6+Math.random()*1.4)+'s'; c.appendChild(s); } }
            bgmWish=/阵亡|同归于尽/.test(text)?'lose':'victory';
            const rb=document.getElementById('btnVictoryRematch'); if(rb) rb.style.display=(gameMode==='online'?'none':'');
            showScreen(document.getElementById('screenVictory'));
        }

        // ============ 流程控制 ============
        function stopBattle(){
            battleActive=false;
            if(animationId) cancelAnimationFrame(animationId);
            entities.forEach(e=>{ if(e.frozenLabelEl){ e.frozenLabelEl.remove(); } });
            entities=[]; projectiles=[]; particles=[]; smokes=[]; foods=[];
            if(gameMode==='storyduel'){ storyMe=null; storyAlly=null; storyFoe=null; }
            battleLv=-1; battleObstacles=[];
            document.querySelectorAll('.damage-pop,.heal-pop,.dodge-pop,.frozen-fixed,.revive-pop,.phone-pop,.deathnote-fixed').forEach(e=>e.remove());
            const jmw0=document.getElementById('joyMoveWrap'), jsw0=document.getElementById('joySkillWrap'), kh0=document.getElementById('kbHint');
            if(jmw0) jmw0.style.display='none'; if(jsw0) jsw0.style.display='none'; if(kh0) kh0.style.display='none';
            isManualBattle=false; manualEnt=null; remoteEnt=null; resetJoysticks();
            mouseAim.on=false; mouseAim.x=1; mouseAim.y=0;
        }
        function endBattle(){
            if(gameMode==='online'){ gameMode='online'; onlineExit(); stopBattle(); gameMode=null; friendsOpen(); return; }
            stopBattle(); if(gameMode==='storyduel'){ showScreen(document.getElementById('screenStory')); requestAnimationFrame(()=>requestAnimationFrame(buildStoryMap)); } else goToModeSelect();
        }
        function rematch(){
            if(gameMode==='free'){ const tmp=player1Role; player1Role=player2Role; player2Role=tmp; if(player1Role&&player2Role) initBattle([player1Role,player2Role]); }
            else if(gameMode==='dual'){ resetDrawState(); showScreen(document.getElementById('screenDualDraw')); stopBattle(); }
            else if(gameMode==='br'){ goToModeSelect(); }
            else if(gameMode==='tri'){ if(triPicked.length>=2) initBattle([...triPicked]); }
            else if(gameMode==='manual'){ if(manualMyRole&&manualEnemyRole) initBattle([manualMyRole,manualEnemyRole]); }
            else if(gameMode==='online'){ onlineExit(); stopBattle(); friendsOpen(); }
            else if(gameMode==='storyduel'){ startStoryLevelBattle(curStoryLevel); }
        }

        const LIGHT_SEL='.btn, .card-display, .modal-box, .set-item';
        let lightOn=false;
        function applyLightSettings(){
            let en='0', lv='gentle', unlocked=false;
            try{ en=localStorage.getItem('lightEnabled')||'0'; lv=localStorage.getItem('lightLevel')||'gentle'; unlocked=localStorage.getItem('lightUnlocked')==='1'; }catch(e){}
            lightOn=(en==='1')&&unlocked;
            const supportsBlur=CSS.supports('backdrop-filter','blur(10px)')||CSS.supports('-webkit-backdrop-filter','blur(10px)');
            if(lightOn&&!supportsBlur) lightOn=false;
            if(lightOn) document.documentElement.dataset.light=lv; else document.documentElement.removeAttribute('data-light');
            const ds=document.getElementById('btnDevSetting'); if(ds) ds.style.display=unlocked?'flex':'none';
            const dt=document.getElementById('btnDevToggle'); if(dt) dt.classList.toggle('on',unlocked);
            const ls=document.getElementById('btnLightSetting'); if(ls) ls.style.display=unlocked?'flex':'none';
            const dss=document.getElementById('btnDevStory'); if(dss) dss.style.display=unlocked?'flex':'none';
            const tg=document.getElementById('btnLightToggle'); if(tg) tg.classList.toggle('on',lightOn);
            const wrap=document.getElementById('lightSegWrap'); if(wrap){ wrap.style.opacity=lightOn?'1':'0.35'; wrap.style.pointerEvents=lightOn?'auto':'none'; }
            document.querySelectorAll('#lightSeg .seg-btn').forEach(b=>b.classList.toggle('active',lightOn&&b.dataset.level===lv));
            // 故事模式已下放为常规模式：按钮常显（不再受开发者选项控制）
            const smb=document.getElementById('btnStoryMode'); if(smb) smb.style.display='';
            let an='0'; try{ an=localStorage.getItem('moreAnim')||'0'; }catch(e){}
            const animOn=(an==='1')&&unlocked;
            if(animOn) document.documentElement.dataset.anim='1'; else document.documentElement.removeAttribute('data-anim');
            const at=document.getElementById('btnAnimToggle'); if(at) at.classList.toggle('on',animOn);
            let hn='1'; try{ hn=localStorage.getItem('hideNames')||'1'; }catch(e){}
            hideNames=hn!=='0';   // 默认屏蔽真实名字，仅开发者选项里可手动关闭
            const ht=document.getElementById('btnHideNameToggle'); if(ht) ht.classList.toggle('on',hideNames);
            syncHiddenRoleUI();
            let mo='0'; try{ mo=localStorage.getItem('bgmOn')||'0'; }catch(e){}
            musicOn=(mo==='1')&&unlocked;   // 背景音乐：默认关闭，且仅在开发者选项开启时生效
            const mt=document.getElementById('btnMusicToggle'); if(mt) mt.classList.toggle('on',musicOn);
            bgmApply();
            let tm=null; try{ tm=localStorage.getItem('triMode'); }catch(e){}
            const triOn=tm!=='0';   // 三合一已下放为常规模式：设置页开关控制，默认开启
            const tt=document.getElementById('btnTriToggle'); if(tt) tt.classList.toggle('on',triOn);
            const tmb=document.getElementById('btnTriMode'); if(tmb) tmb.style.display=triOn?'':'none';
            ['btnFreeMode','btnDualMode','btnBRMode'].forEach(id=>{ const b=document.getElementById(id); if(b) b.style.display=triOn?'none':''; });   // 三合一开启时三种模式融合为一项
            if(!triOn && document.getElementById('screenTri') && document.getElementById('screenTri').classList.contains('active')) goToModeSelect();
            syncHiddenNames();
        }
        function attachLightLayer(el){ if(el._lightLayer) return; const layer=document.createElement('span'); layer.className='glass-light'; el.appendChild(layer); el._lightLayer=layer; el.classList.add('glass'); }
        function initLightSense(){
            applyLightSettings();
            let rafId=null, px=0, py=0, pEl=null;
            document.addEventListener('pointermove',(ev)=>{ if(!lightOn) return; px=ev.clientX; py=ev.clientY; pEl=ev.target&&ev.target.closest?ev.target.closest(LIGHT_SEL):null; if(rafId) return; rafId=requestAnimationFrame(()=>{ rafId=null; if(pEl&&pEl.isConnected){ if(!pEl.classList.contains('glass')) attachLightLayer(pEl); if(pEl._lightLayer){ const r=pEl.getBoundingClientRect(); pEl._lightLayer.style.setProperty('--mx',(px-r.left)+'px'); pEl._lightLayer.style.setProperty('--my',(py-r.top)+'px'); const ang=(Math.atan2(py-(r.top+r.height/2),px-(r.left+r.width/2))*180/Math.PI+450)%360; pEl.style.setProperty('--la',(ang-305)+'deg'); pEl.classList.add('on'); } } }); },{passive:true});
            document.addEventListener('pointerout',(ev)=>{ const el=ev.target&&ev.target.closest?ev.target.closest(LIGHT_SEL):null; if(el) el.classList.remove('on'); },{passive:true});
            document.addEventListener('pointerdown',(ev)=>{ if(!lightOn) return; const el=ev.target&&ev.target.closest?ev.target.closest(LIGHT_SEL):null; if(!el) return; if(!el.classList.contains('glass')) attachLightLayer(el); const r=el.getBoundingClientRect(); el.style.transformOrigin=(ev.clientX-r.left)+'px '+(ev.clientY-r.top)+'px'; el.classList.add('pressing'); el.style.transform='scale(1.05,0.9)'; const ring=document.createElement('span'); ring.className='glow-ring'; const sz=Math.max(r.width,r.height)*1.2; ring.style.cssText='width:'+sz+'px;height:'+sz+'px;left:'+(ev.clientX-r.left)+'px;top:'+(ev.clientY-r.top)+'px;'; el.appendChild(ring); setTimeout(()=>ring.remove(),600); },{passive:true});
            const unpress=()=>{ document.querySelectorAll('.glass.pressing').forEach(el=>{ el.classList.remove('pressing'); el.style.transform=''; el.style.transformOrigin=''; el.classList.remove('wobble'); void el.offsetWidth; el.classList.add('wobble'); setTimeout(()=>el.classList.remove('wobble'),480); }); };
            document.addEventListener('pointerup',unpress,{passive:true});
            document.addEventListener('pointercancel',unpress,{passive:true});
            document.querySelectorAll('#lightSeg .seg-btn').forEach(b=>b.addEventListener('click',()=>{ sfxClick(); try{ localStorage.setItem('lightLevel',b.dataset.level); }catch(e){} applyLightSettings(); }));
        }

        // ============ 摇杆布局（位置/大小自定义，持久化） ============
        const DEFAULT_JOY_LAYOUT={ move:{x:13,y:86,s:108}, skill:{x:87,y:86,s:108} };
        let joyLayout=JSON.parse(JSON.stringify(DEFAULT_JOY_LAYOUT));
        function loadJoyLayout(){ try{ const raw=localStorage.getItem('joyLayout'); if(raw){ const p=JSON.parse(raw); if(p&&p.move&&p.skill&&p.move.x!=null) joyLayout=p; } }catch(e){} applyJoyLayout(); renderJoyPreview(); }
        function saveJoyLayout(){ try{ localStorage.setItem('joyLayout',JSON.stringify(joyLayout)); }catch(e){} }
        function applyJoyLayout(){
            [['joyMoveWrap','move'],['joySkillWrap','skill']].forEach(([id,k])=>{
                const w=document.getElementById(id); if(!w) return;
                const c=joyLayout[k], half=c.s/2;
                w.style.width=c.s+'px'; w.style.height=c.s+'px';
                w.style.left=c.x+'%'; w.style.top=c.y+'%';
                w.style.right='auto'; w.style.bottom='auto';
                w.style.marginLeft=(-half)+'px'; w.style.marginTop=(-half)+'px';
            });
        }
        function renderJoyPreview(){
            [['jpMove','move'],['jpSkill','skill']].forEach(([id,k])=>{
                const el=document.getElementById(id); if(!el) return;
                const c=joyLayout[k];
                el.style.left=c.x+'%'; el.style.top=c.y+'%';
                el.style.width=c.s+'px'; el.style.height=c.s+'px';   // 全屏预览与实战 1:1
            });
            const r=document.getElementById('joySizeRange'), v=document.getElementById('joySizeVal');
            if(r) r.value=joyLayout.move.s; if(v) v.textContent=joyLayout.move.s;
        }
        function initJoySettings(){
            const stage=document.getElementById('joyStage');
            [['jpMove','move'],['jpSkill','skill']].forEach(([id,k])=>{
                const el=document.getElementById(id); let pid=null, bx=0, by=0, w=0, h=0;
                function pad(){ const r=stage.getBoundingClientRect(); const pw=(el.offsetWidth/2)/r.width*100+2, ph=(el.offsetHeight/2)/r.height*100+2; return {pw,ph}; }
                function start(ev){ pid=ev.pointerId; try{ el.setPointerCapture(pid); }catch(e){} const r=stage.getBoundingClientRect(); bx=r.left; by=r.top; w=r.width; h=r.height; ev.preventDefault(); }
                function move(ev){ if(ev.pointerId!==pid) return; const {pw,ph}=pad(); let px=(ev.clientX-bx)/w*100, py=(ev.clientY-by)/h*100; px=Math.max(pw,Math.min(100-pw,px)); py=Math.max(ph,Math.min(100-ph,py)); joyLayout[k].x=Math.round(px); joyLayout[k].y=Math.round(py); renderJoyPreview(); applyJoyLayout(); }
                function end(ev){ if(ev.pointerId!==pid) return; pid=null; saveJoyLayout(); sfxClick(); }
                el.addEventListener('pointerdown',start);
                el.addEventListener('pointermove',move);
                el.addEventListener('pointerup',end);
                el.addEventListener('pointercancel',end);
            });
            const range=document.getElementById('joySizeRange');
            if(range) range.addEventListener('input',()=>{ const s=+range.value; joyLayout.move.s=s; joyLayout.skill.s=s; renderJoyPreview(); applyJoyLayout(); });
            if(range) range.addEventListener('change',()=>saveJoyLayout());
        }

        // ============ 双摇杆（手动对战） ============
        function setupJoystick(baseId, vec, onEnd){
            const base=document.getElementById(baseId);
            const knob=base.querySelector('.joy-knob');
            let pid=null, cx=0, cy=0, R=40;
            function knobAt(dx,dy){ knob.style.transform='translate(calc(-50% + '+dx.toFixed(1)+'px), calc(-50% + '+dy.toFixed(1)+'px))'; }
            function start(ev){ if(pid!==null) return; pid=ev.pointerId; try{ base.setPointerCapture(pid); }catch(e){} const r=base.getBoundingClientRect(); cx=r.left+r.width/2; cy=r.top+r.height/2; R=r.width*0.37; vec.active=true; vec._touch=true; move(ev); ev.preventDefault(); }
            function move(ev){ if(ev.pointerId!==pid) return; let dx=ev.clientX-cx, dy=ev.clientY-cy; const d=Math.hypot(dx,dy); if(d>R){ dx=dx/d*R; dy=dy/d*R; } knobAt(dx,dy); vec.x=dx/R; vec.y=dy/R; }
            function end(ev){ if(ev.pointerId!==pid) return; pid=null; vec.active=false; vec._touch=false; const fx=vec.x, fy=vec.y; vec.x=0; vec.y=0; knob.style.transform='translate(-50%,-50%)'; if(onEnd) onEnd(fx,fy); }
            base.addEventListener('pointerdown',start);
            base.addEventListener('pointermove',move);
            base.addEventListener('pointerup',end);
            base.addEventListener('pointercancel',end);
            base.addEventListener('lostpointercapture',end);
        }
        function tryManualSkill(fx,fy){
            const mag=Math.hypot(fx,fy);
            if(!isManualBattle || !manualEnt || manualEnt.hp<=0 || mag<0.4) return;
            const ts=performance.now();
            if(ts<manualEnt.frozenUntil || ts-manualEnt.lastSkillTime<manualEnt.role.skillInterval) return;
            manualEnt.lastSkillTime=ts;
            if(netGuest){
                const ang=Math.atan2(fy,fx);
                netSendInput({s:ang});
                try{ sfxShoot(); }catch(e){}
                // 本地枪口火光：技能判定在房主端，先给即时反馈
                try{
                    const mx=manualEnt.x+Math.cos(ang)*(manualEnt.size*0.6), my=manualEnt.y+Math.sin(ang)*(manualEnt.size*0.6);
                    spawnParticles(mx,my,manualEnt.role.projectileColor||'#ffffff',6);
                }catch(e){}
                return;
            }
            fireSkill(manualEnt, Math.atan2(fy,fx));
        }
        function resetJoysticks(){
            [joyMove,joySkill].forEach(v=>{ v.x=0; v.y=0; v.active=false; v._touch=false; });
            document.querySelectorAll('#joyMoveWrap .joy-knob, #joySkillWrap .joy-knob').forEach(k=>k.style.transform='translate(-50%,-50%)');
            const cd=document.getElementById('joyCd'); if(cd) cd.style.background='';
        }
        function updateSkillCooldown(ts){
            const cd=document.getElementById('joyCd'); if(!cd || !isManualBattle || !manualEnt) return;
            const interval=manualEnt.role.skillInterval||1;
            const frac=Math.min(1,Math.max(0,(interval-(ts-manualEnt.lastSkillTime))/interval));
            if(frac<=0.01){ cd.style.background=''; }
            else{ const pct=(frac*100).toFixed(1); cd.style.background='conic-gradient(rgba(0,0,0,0.62) '+pct+'%, rgba(0,0,0,0) '+pct+'%)'; }
        }
        function initJoysticks(){ setupJoystick('joyMove',joyMove); setupJoystick('joySkill',joySkill,tryManualSkill); }

        // ============ 电脑端检测（主指针为鼠标+可悬停 → 键盘鼠标操控；手机/平板走摇杆） ============
        const IS_PC=(function(){ try{ return window.matchMedia('(pointer:fine)').matches&&window.matchMedia('(hover:hover)').matches; }catch(e){ return !(('ontouchstart' in window)||navigator.maxTouchPoints>0); } })();
        const mouseAim={x:1,y:0,on:false};

        // ============ 键盘控制（手动对战） ============
        const kb={w:false,a:false,s:false,d:false,up:false,left:false,down:false,right:false,i:false,j:false,k:false,l:false};
        function kbVec(){
            let mx=0,my=0;
            if(kb.w) my-=1; if(kb.s) my+=1; if(kb.a) mx-=1; if(kb.d) mx+=1;
            if(kb.up) my-=1; if(kb.down) my+=1; if(kb.left) mx-=1; if(kb.right) mx+=1;
            const m=Math.hypot(mx,my); if(m>1){ mx/=m; my/=m; }
            let sx=0,sy=0;
            if(kb.i) sy-=1; if(kb.k) sy+=1; if(kb.j) sx-=1; if(kb.l) sx+=1;
            const s=Math.hypot(sx,sy); if(s>1){ sx/=s; sy/=s; }
            return {mx,my,sx,sy};
        }
        function kbSync(){
            if(!isManualBattle) return;
            const v=kbVec();
            if(v.mx||v.my){ joyMove.x=v.mx; joyMove.y=v.my; joyMove.active=true; }
            else if(!joyMove._touch){ joyMove.x=0; joyMove.y=0; joyMove.active=false; }
            if(v.sx||v.sy){ joySkill.x=v.sx; joySkill.y=v.sy; joySkill.active=true; }
            else if(!joySkill._touch){ joySkill.x=0; joySkill.y=0; joySkill.active=false; }
            if(IS_PC&&mouseAim.on&&manualEnt&&manualEnt.hp>0&&!(v.sx||v.sy)){ joySkill.x=mouseAim.x; joySkill.y=mouseAim.y; joySkill.active=true; }
        }
        setInterval(kbSync, 16);
        document.addEventListener('keydown',(ev)=>{
            if(!isManualBattle) return;
            const k=ev.key.toLowerCase();
            if(k==='w')kb.w=true; else if(k==='a')kb.a=true; else if(k==='s')kb.s=true; else if(k==='d')kb.d=true;
            else if(k==='arrowup')kb.up=true; else if(k==='arrowdown')kb.down=true; else if(k==='arrowleft')kb.left=true; else if(k==='arrowright')kb.right=true;
            else if(k==='i')kb.i=true; else if(k==='j')kb.j=true; else if(k==='k')kb.k=true; else if(k==='l')kb.l=true;
            else if(k===' '||k==='spacebar'){ ev.preventDefault(); tryManualSkill(joySkill.x,joySkill.y); return; }
            else return;
            if(k.startsWith('arrow')||k===' ') ev.preventDefault();
        });
        document.addEventListener('keyup',(ev)=>{
            const k=ev.key.toLowerCase();
            if(k==='w')kb.w=false; else if(k==='a')kb.a=false; else if(k==='s')kb.s=false; else if(k==='d')kb.d=false;
            else if(k==='arrowup')kb.up=false; else if(k==='arrowdown')kb.down=false; else if(k==='arrowleft')kb.left=false; else if(k==='arrowright')kb.right=false;
            else if(k==='i')kb.i=false; else if(k==='j')kb.j=false; else if(k==='k')kb.k=false; else if(k==='l')kb.l=false;
        });

        // ============ 电脑端：全屏鼠标瞄准 + 左键发射 ============
        const battleCv=document.getElementById('battleCanvas');
        function updateMouseAim(cx,cy){
            if(!IS_PC||!isManualBattle||!manualEnt||manualEnt.hp<=0) return;
            const r=battleCv.getBoundingClientRect();
            const mx=(cx-r.left)*(battleCv.width/r.width), my=(cy-r.top)*(battleCv.height/r.height);
            const dx=mx-manualEnt.x, dy=my-manualEnt.y, d=Math.hypot(dx,dy);
            if(d<0.5) return;
            mouseAim.x=dx/d; mouseAim.y=dy/d; mouseAim.on=true;
            // 立即写入瞄准方向，不等 16ms 轮询，鼠标指哪瞄哪
            if(!(kb.i||kb.j||kb.k||kb.l)){ joySkill.x=mouseAim.x; joySkill.y=mouseAim.y; joySkill.active=true; }
        }
        if(battleCv){
            // 全屏识别：鼠标移到窗口任意位置（HUD、按钮、画布外）都能瞄准
            window.addEventListener('mousemove',(ev)=>updateMouseAim(ev.clientX,ev.clientY),{passive:true});
            window.addEventListener('mousedown',(ev)=>{
                if(!IS_PC||!isManualBattle||ev.button!==0) return;
                const t=ev.target;
                // 点 UI 控件（按钮/退出/摇杆提示等）不发射技能
                if(t&&t.closest&&t.closest('button,a,input,select,.joy-base,#joyMoveWrap,#joySkillWrap,#kbHint,#battleResult')) return;
                if(mouseAim.on){ tryManualSkill(mouseAim.x,mouseAim.y); ev.preventDefault(); }
            });
        }

        // ============ 事件绑定 ============
        document.getElementById('btnStartGame').addEventListener('click',()=>showScreen(document.getElementById('screenMode')));
        document.getElementById('btnShowRules').addEventListener('click',()=>{ const m=document.getElementById('modalRules'); m.classList.remove('active'); void m.offsetWidth; m.classList.add('active'); });
        document.getElementById('btnSettings').addEventListener('click',()=>showScreen(document.getElementById('screenSettings')));
        document.getElementById('btnSettingsBack').addEventListener('click',()=>showScreen(document.getElementById('screenMenu')));
        // 全屏模式（网页版专属）：支持 Fullscreen API 才显示按钮
        (function(){
            const fsb=document.getElementById('btnFullscreen');
            if(!fsb) return;
            if(document.documentElement.requestFullscreen){
                fsb.addEventListener('click',()=>{ sfxClick(); if(document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(()=>{}); });
                document.addEventListener('fullscreenchange',()=>{ fsb.textContent=document.fullscreenElement?'🗗 退出全屏':'⛶ 全屏'; });
            } else fsb.style.display='none';
        })();
        document.getElementById('btnAbout').addEventListener('click',()=>showScreen(document.getElementById('screenAbout')));
        document.getElementById('btnAboutBack').addEventListener('click',()=>showScreen(document.getElementById('screenSettings')));
        document.getElementById('btnDevSetting').addEventListener('click',()=>showScreen(document.getElementById('screenDev')));
        document.getElementById('btnDevBack').addEventListener('click',()=>showScreen(document.getElementById('screenSettings')));
        document.getElementById('btnDevToggle').addEventListener('click',()=>{ const btn=document.getElementById('btnDevToggle'); const on=!btn.classList.contains('on'); try{ if(on) localStorage.setItem('lightUnlocked','1'); else{ localStorage.removeItem('lightUnlocked'); localStorage.removeItem('moreAnim'); localStorage.removeItem('hideNames'); localStorage.removeItem('hideZhu'); localStorage.removeItem('bgmOn'); } }catch(e){} sfxClick(); applyLightSettings(); if(!on) showScreen(document.getElementById('screenSettings')); });
        document.getElementById('btnJoySetting').addEventListener('click',()=>{ renderJoyPreview(); showScreen(document.getElementById('screenJoySettings')); });
        document.getElementById('btnJoyBack').addEventListener('click',()=>{ showScreen(document.getElementById('screenSettings')); });
        document.getElementById('btnJoyReset').addEventListener('click',()=>{ joyLayout=JSON.parse(JSON.stringify(DEFAULT_JOY_LAYOUT)); saveJoyLayout(); applyJoyLayout(); renderJoyPreview(); sfxClick(); });
        document.getElementById('btnStoryMode').addEventListener('click',()=>{ showScreen(document.getElementById('screenStory')); requestAnimationFrame(()=>requestAnimationFrame(buildStoryMap)); });
        document.getElementById('btnDevStory').addEventListener('click',()=>{ sfxClick(); renderDevStoryList(); showScreen(document.getElementById('screenDevStory')); });
        document.getElementById('btnDevStoryBack').addEventListener('click',()=>{ sfxClick(); showScreen(document.getElementById('screenDev')); });
        document.getElementById('btnStoryBack').addEventListener('click',goToModeSelect);
        document.getElementById('btnStoryTestBack').addEventListener('click',()=>showScreen(document.getElementById('screenStory')));
        document.getElementById('btnStoryTestStart').addEventListener('click',()=>{ startStoryLevelBattle(curStoryLevel); });
        // ---- 序章剧情事件 ----
        document.getElementById('dlgBox').addEventListener('click',()=>{ onDlgTap(); });
        document.getElementById('btnIvAccept').addEventListener('click',()=>{ sfxClick(); if(curStoryLevel===1) startL1Battle(); else startStoryDuel(); });
        document.getElementById('btnIvRefuse').addEventListener('click',()=>{ sfxClick(); if(curStoryLevel===1) lcyScoldThen(0); else fqScoldThen(0); });
        document.getElementById('btnSceneQuit').addEventListener('click',()=>{ clearProTimers(); blinkOverlay.classList.remove('blink-close','blink-open','blink-alarm'); document.getElementById('screenStoryScene').classList.remove('over-lid'); scoldStars=-1; showScreen(document.getElementById('screenStory')); requestAnimationFrame(()=>requestAnimationFrame(buildStoryMap)); });
        document.getElementById('btnSrRetry').addEventListener('click',()=>{ sfxClick(); if(curStoryLevel===1) startL1Battle(); else if(srStars===0&&curStoryLevel===0){ scoldStars=-1; showScreen(document.getElementById('screenStoryScene')); showDuelChoice(); } else startStoryLevelBattle(curStoryLevel); });
        document.getElementById('btnSrMap').addEventListener('click',()=>{ sfxClick(); clearProTimers(); blinkOverlay.classList.remove('blink-close','blink-open','blink-alarm'); document.getElementById('screenStoryScene').classList.remove('over-lid'); showScreen(document.getElementById('screenStory')); requestAnimationFrame(()=>requestAnimationFrame(buildStoryMap)); });
        document.getElementById('btnAnimToggle').addEventListener('click',()=>{ const on=!document.getElementById('btnAnimToggle').classList.contains('on'); try{ localStorage.setItem('moreAnim',on?'1':'0'); }catch(e){} sfxClick(); applyLightSettings(); });
        document.getElementById('btnHideNameToggle').addEventListener('click',()=>{ const on=!document.getElementById('btnHideNameToggle').classList.contains('on'); try{ localStorage.setItem('hideNames',on?'1':'0'); }catch(e){} sfxClick(); applyLightSettings(); });
        document.getElementById('btnHideZhuToggle').addEventListener('click',()=>{ const on=!document.getElementById('btnHideZhuToggle').classList.contains('on'); try{ localStorage.setItem('hideZhu',on?'1':'0'); }catch(e){} sfxClick(); applyLightSettings(); });
        document.getElementById('btnMusicToggle').addEventListener('click',()=>{ const on=!document.getElementById('btnMusicToggle').classList.contains('on'); try{ localStorage.setItem('bgmOn',on?'1':'0'); }catch(e){} sfxClick(); applyLightSettings(); });
        document.getElementById('btnTriToggle').addEventListener('click',()=>{ const on=!document.getElementById('btnTriToggle').classList.contains('on'); try{ localStorage.setItem('triMode',on?'1':'0'); }catch(e){} sfxClick(); applyLightSettings(); });
        document.getElementById('btnTriMode').addEventListener('click',startTriMode);
        document.getElementById('btnTriStart').addEventListener('click',startTriBattle);
        document.getElementById('btnTriBack').addEventListener('click',()=>{ stopBattle(); showScreen(document.getElementById('screenMode')); });
        document.getElementById('btnLightSetting').addEventListener('click',()=>showScreen(document.getElementById('screenLight')));
        document.getElementById('btnLightBack').addEventListener('click',()=>showScreen(document.getElementById('screenDev')));
        document.getElementById('btnLightToggle').addEventListener('click',()=>{ lightOn=!lightOn; try{ localStorage.setItem('lightEnabled',lightOn?'1':'0'); }catch(e){} sfxClick(); applyLightSettings(); });
        document.getElementById('aboutVersion').textContent='版本 '+document.getElementById('versionLabel').textContent;
        // ============ 假AI客服 ============
        const csMsgs=document.getElementById('csMsgs'), csInput=document.getElementById('csInput'), csSend=document.getElementById('csSend');
        let csTimer=null, csBusy=false, csGreeted=false;
        function csScroll(){ csMsgs.scrollTop=csMsgs.scrollHeight; }
        function csPush(text,me){
            const d=document.createElement('div');
            d.className='cs-msg '+(me?'me':'bot');
            d.textContent=text;
            csMsgs.appendChild(d); csScroll();
            return d;
        }
        function csThinkThen(text){
            csBusy=true; csSend.style.opacity='0.45'; csSend.style.pointerEvents='none';
            const t=document.createElement('div');
            t.className='cs-msg bot think'; t.innerHTML='<span class="cs-dot"></span><span class="cs-dot"></span><span class="cs-dot"></span>';
            csMsgs.appendChild(t); csScroll();
            csTimer=setTimeout(()=>{
                t.remove(); csPush(text,false); sfxClick();
                csBusy=false; csSend.style.opacity=''; csSend.style.pointerEvents=''; csScroll();
            },1200+Math.random()*900);
        }
        function csReply(text){
            const q=(text||'').trim();
            if(/密码|password|暗号|口令|开发|入口/.test(q)){ csThinkThen('114514'); return; }
            const pool=[
                '好的，您的建议已经记录下来了，我正在反馈给作者，感谢您对游戏的支持！😊',
                '收到！已经帮您把这个问题反馈给作者了，作者会尽快查看处理，感谢支持～',
                '嗯嗯，我这边已经提交给作者了，后续版本更新时多多留意哦！🙏',
                '好的亲，您的反馈已加急上报给作者，有进展会第一时间同步给您！'
            ];
            csThinkThen(pool[Math.floor(Math.random()*pool.length)]);
        }
        function csSendMsg(){
            if(csBusy) return;
            const v=csInput.value; if(!v.trim()) return;
            csPush(v,true); sfxClick();
            csInput.value='';
            csReply(v);
        }
        csSend.addEventListener('click',csSendMsg);
        csInput.addEventListener('keydown',(e)=>{ if(e.key==='Enter') csSendMsg(); });
        document.getElementById('btnSupport').addEventListener('click',()=>{
            sfxClick(); showScreen(document.getElementById('screenSupport'));
            if(!csGreeted){ csGreeted=true;
                csPush('您好～我是官方客服小卡🎧',false);
                csThinkThen('很高兴为您服务！有任何关于游戏的建议、想反馈的问题，都可以告诉我哦～');
            }
            csScroll();
        });
        document.getElementById('btnSupportBack').addEventListener('click',()=>{ sfxClick(); clearTimeout(csTimer); csBusy=false; csSend.style.opacity=''; csSend.style.pointerEvents=''; showScreen(document.getElementById('screenMenu')); });
        // ============ 账号 / 资料 / 好友（Cloudflare Pages Functions + D1，密码只在服务端哈希） ============
        const AUTH_TOKEN_KEY='kpdjAuthToken';
        let authToken='', authUser=null, authMode='login';
        let friendsCache={friends:[],incoming:[],outgoing:[],unread:{total:0,by:{}}}, friendsTab='list';
        let chatPid='', chatName='', chatLastId=0, chatTimer=null;
        function authRead(){ try{ authToken=localStorage.getItem(AUTH_TOKEN_KEY)||''; }catch(e){ authToken=''; } }
        function authSave(t,u){
            authToken=t||''; authUser=u||null;
            try{ if(authToken) localStorage.setItem(AUTH_TOKEN_KEY,authToken); else localStorage.removeItem(AUTH_TOKEN_KEY); }catch(e){}
            authRender();
        }
        async function authApi(path,opts){
            const o=opts||{}, headers={'content-type':'application/json'};
            if(authToken) headers.authorization='Bearer '+authToken;
            let res;
            try{ res=await fetch('/api'+path,{method:o.method||'GET',headers,body:o.body==null?undefined:JSON.stringify(o.body)}); }
            catch(e){ const er=new Error('网络连接失败，请检查网络后重试'); er.offline=true; throw er; }
            let data=null; try{ data=await res.json(); }catch(e){}
            if(!res.ok){ const er=new Error((data&&data.error&&data.error.message)||('请求失败 '+res.status)); er.status=res.status; throw er; }
            return data||{};
        }
        function displayName(u){ return u?(u.nickname||u.username):''; }
        function setAvatarEl(imgEl,fbEl,avatar){
            if(!imgEl) return;
            if(avatar){ imgEl.src=avatar; imgEl.style.display=''; if(fbEl) fbEl.style.display='none'; }
            else { imgEl.removeAttribute('src'); imgEl.style.display='none'; if(fbEl) fbEl.style.display=''; }
        }
        function authRender(){
            const btn=document.getElementById('btnAccount'); if(btn) btn.textContent=authUser?('👤 '+displayName(authUser)):'👤 登录 / 注册';
            const av=document.getElementById('accAuthView'), pv=document.getElementById('accProfileView');
            if(av) av.style.display=authUser?'none':'';
            if(pv) pv.style.display=authUser?'':'none';
            if(authUser){
                const n=document.getElementById('accName'); if(n) n.textContent=displayName(authUser);
                const p=document.getElementById('accPid'); if(p) p.textContent='@'+authUser.username+' · ID '+authUser.pid;
                setAvatarEl(document.getElementById('accAvatar'),document.getElementById('accAvatarFallback'),authUser.avatar);
            }
            if(!authUser){
                const fb=document.getElementById('friendBadge'); if(fb) fb.style.display='none';
            }
            accSettingsFill();
        }
        function authErr(msg){ const el=document.getElementById('accErr'); if(el) el.textContent=msg||''; }
        function authSetMode(m){
            authMode=m;
            const l=document.getElementById('btnAccTabLogin'), r=document.getElementById('btnAccTabReg');
            if(l) l.classList.toggle('active',m==='login');
            if(r) r.classList.toggle('active',m==='reg');
            const s=document.getElementById('btnAccSubmit'); if(s) s.textContent=m==='login'?'登录':'注册并登录';
            const p2=document.getElementById('accPass2');
            if(p2){ p2.style.display=m==='reg'?'':'none'; if(m!=='reg') p2.value=''; }
            const p=document.getElementById('accPass'); if(p) p.setAttribute('autocomplete',m==='reg'?'new-password':'current-password');
            const tip=document.getElementById('accTip');
            if(tip) tip.textContent=m==='login'?'登录后可在不同设备使用同一账号。':'注册即创建新账号，不需要手机号或验证码。';
            authErr('');
        }
        async function authSubmit(){
            const u=(document.getElementById('accUser').value||'').trim();
            const p=document.getElementById('accPass').value||'';
            if(u.length<2||u.length>20) return authErr('账号需为 2-20 个字符');
            if(/\s/.test(u)) return authErr('账号不能包含空格');
            if(p.length<6||p.length>64) return authErr('密码需为 6-64 位');
            if(authMode==='reg'){
                const p2=document.getElementById('accPass2').value||'';
                if(!p2) return authErr('请再次输入密码');
                if(p!==p2) return authErr('两次输入的密码不一致');
            }
            const btn=document.getElementById('btnAccSubmit');
            if(btn&&btn.disabled) return;
            if(btn) btn.disabled=true;
            authErr('');
            try{
                const data=await authApi(authMode==='login'?'/auth/login':'/auth/register',{method:'POST',body:{username:u,password:p}});
                authSave(data.token,data.user);
                document.getElementById('accPass').value='';
                const p2el=document.getElementById('accPass2'); if(p2el) p2el.value='';
                sfxClick(); friendsRefreshBadge();
            }catch(e){ authErr(e.message); }
            finally{ if(btn) btn.disabled=false; }
        }
        function authInit(){
            authRead(); authRender();
            if(!authToken) return;
            authApi('/auth/me').then(d=>{ authUser=d.user; authRender(); friendsRefreshBadge(); }).catch(e=>{ if(e.status===401) authSave('',null); });
        }

        // ---------- 账号设置 ----------
        function asMsg(el,text,ok){ if(!el) return; el.textContent=text||''; el.style.color=ok?'#7ee2a8':'#ff6b6b'; }
        function accSettingsFill(){
            const body=document.getElementById('asBody'), hint=document.getElementById('asLoginHint');
            if(body) body.style.display=authUser?'':'none';
            if(hint) hint.style.display=authUser?'none':'';
            if(!authUser) return;
            setAvatarEl(document.getElementById('asAvatar'),document.getElementById('asAvatarFallback'),authUser.avatar);
            const n=document.getElementById('asNickname'); if(n) n.value=displayName(authUser);
            ['asOldPass','asNewPass','asNewPass2'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
            asMsg(document.getElementById('asPassErr'),'');
            asMsg(document.getElementById('asNickErr'),'');
        }
        function accSettingsOpen(){
            if(!authUser){ authErr('请先登录后再进入账号设置'); showScreen(document.getElementById('screenAccount')); authRender(); return; }
            accSettingsFill();
            showScreen(document.getElementById('screenAccSettings'));
        }
        function compressImage(file,size,quality){
            return new Promise((resolve,reject)=>{
                const reader=new FileReader();
                reader.onload=()=>{
                    const img=new Image();
                    img.onload=()=>{
                        try{
                            const c=document.createElement('canvas'); c.width=size; c.height=size;
                            const ctx=c.getContext('2d');
                            const s=Math.min(img.width,img.height);
                            ctx.drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,size,size);
                            resolve(c.toDataURL('image/jpeg',quality));
                        }catch(e){ reject(new Error('图片处理失败')); }
                    };
                    img.onerror=()=>reject(new Error('图片读取失败'));
                    img.src=reader.result;
                };
                reader.onerror=()=>reject(new Error('图片读取失败'));
                reader.readAsDataURL(file);
            });
        }
        async function asUploadAvatar(file){
            if(!file) return;
            if(!/^image\//.test(file.type)) return asMsg(document.getElementById('asNickErr'),'请选择图片文件',false);
            asMsg(document.getElementById('asNickErr'),'正在处理头像…',true);
            try{
                const dataUrl=await compressImage(file,128,0.82);
                const d=await authApi('/auth/profile',{method:'PATCH',body:{avatar:dataUrl}});
                authUser=d.user; authRender(); asMsg(document.getElementById('asNickErr'),'头像已更新',true); sfxClick();
            }catch(e){ asMsg(document.getElementById('asNickErr'),e.message,false); }
        }
        async function asRemoveAvatar(){
            if(!authUser) return;
            try{ const d=await authApi('/auth/profile',{method:'PATCH',body:{avatar:''}}); authUser=d.user; authRender(); asMsg(document.getElementById('asNickErr'),'头像已移除',true); sfxClick(); }
            catch(e){ asMsg(document.getElementById('asNickErr'),e.message,false); }
        }
        async function asSaveNickname(){
            if(!authUser) return;
            const inp=document.getElementById('asNickname'), v=(inp.value||'').trim();
            if(!v) return asMsg(document.getElementById('asNickErr'),'昵称不能为空',false);
            if(v.length>16) return asMsg(document.getElementById('asNickErr'),'昵称不能超过 16 个字符',false);
            const btn=document.getElementById('btnAsSaveNick'); if(btn&&btn.disabled) return; if(btn) btn.disabled=true;
            try{ const d=await authApi('/auth/profile',{method:'PATCH',body:{nickname:v}}); authUser=d.user; authRender(); asMsg(document.getElementById('asNickErr'),'昵称已保存',true); sfxClick(); }
            catch(e){ asMsg(document.getElementById('asNickErr'),e.message,false); }
            finally{ if(btn) btn.disabled=false; }
        }
        async function asSavePassword(){
            if(!authUser) return;
            const oldP=document.getElementById('asOldPass').value||'';
            const newP=document.getElementById('asNewPass').value||'';
            const newP2=document.getElementById('asNewPass2').value||'';
            if(!oldP) return asMsg(document.getElementById('asPassErr'),'请输入当前密码',false);
            if(newP.length<6||newP.length>64) return asMsg(document.getElementById('asPassErr'),'新密码需为 6-64 位',false);
            if(newP!==newP2) return asMsg(document.getElementById('asPassErr'),'两次输入的新密码不一致',false);
            const btn=document.getElementById('btnAsSavePass'); if(btn&&btn.disabled) return; if(btn) btn.disabled=true;
            try{
                await authApi('/auth/password',{method:'POST',body:{oldPassword:oldP,newPassword:newP}});
                ['asOldPass','asNewPass','asNewPass2'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
                asMsg(document.getElementById('asPassErr'),'密码已修改',true); sfxClick();
            }catch(e){ asMsg(document.getElementById('asPassErr'),e.message,false); }
            finally{ if(btn) btn.disabled=false; }
        }

        // ---------- 好友 ----------
        function frAvatarEl(item){
            if(item&&item.avatar){ const im=document.createElement('img'); im.className='fr-avatar'; im.src=item.avatar; im.alt=''; return im; }
            const d=document.createElement('div'); d.className='fr-avatar-fallback';
            d.textContent=String((item&&(item.nickname||item.username))||'?').slice(0,1);
            return d;
        }
        function frBtn(label,cls,fn){
            const b=document.createElement('button'); b.type='button'; b.className='fr-btn'+(cls?' '+cls:''); b.textContent=label;
            b.addEventListener('click',ev=>{ ev.stopPropagation(); sfxClick(); fn(b); });
            return b;
        }
        function frRow(item,subText,actions){
            const row=document.createElement('div'); row.className='fr-row';
            row.appendChild(frAvatarEl(item));
            const main=document.createElement('div'); main.className='fr-main';
            const nm=document.createElement('div'); nm.className='fr-name'; nm.textContent=displayName(item);
            const sb=document.createElement('div'); sb.className='fr-subline'; sb.textContent=subText||('@'+item.username);
            main.appendChild(nm); main.appendChild(sb); row.appendChild(main);
            if(actions&&actions.length){ const act=document.createElement('div'); act.className='fr-actions'; actions.forEach(a=>act.appendChild(a)); row.appendChild(act); }
            return row;
        }
        function updateFriendBadges(){
            const total=(friendsCache.unread&&friendsCache.unread.total)||0;
            const fb=document.getElementById('friendBadge'); if(fb){ fb.textContent=total; fb.style.display=authUser&&total?'':'none'; }
            const inc=(friendsCache.incoming||[]).length;
            const rb=document.getElementById('frReqBadge'); if(rb){ rb.textContent=inc; rb.style.display=inc?'':'none'; }
        }
        async function friendsRefreshBadge(){
            if(!authUser){ const fb=document.getElementById('friendBadge'); if(fb) fb.style.display='none'; return; }
            try{ const d=await authApi('/messages/unread'); const fb=document.getElementById('friendBadge'); if(fb){ fb.textContent=d.total||0; fb.style.display=d.total?'':'none'; } }catch(e){}
        }
        async function friendsLoad(){
            if(!authUser) return;
            const d=await authApi('/friends');
            friendsCache={friends:d.friends||[],incoming:d.incoming||[],outgoing:d.outgoing||[],unread:d.unread||{total:0,by:{}}};
            renderFriends(); updateFriendBadges();
        }
        function renderFriends(){
            const list=document.getElementById('frList'); if(!list) return;
            list.innerHTML='';
            const items=friendsCache.friends||[];
            const empty=document.getElementById('frEmpty');
            if(empty){ empty.textContent='还没有好友，去「添加」搜索账号吧'; empty.style.display=items.length?'none':''; }
            items.forEach(f=>{
                const del=frBtn('删除','danger',async b=>{
                    if(!confirm('确定删除好友「'+displayName(f)+'」吗？')) return;
                    b.disabled=true;
                    try{ await authApi('/friends/'+encodeURIComponent(f.pid),{method:'DELETE'}); friendsLoad(); }
                    catch(e){ alert(e.message); b.disabled=false; }
                });
                const chat=frBtn('聊天','primary',()=>chatOpen(f.pid,displayName(f)));
                const acts=[];
                if(f.room&&f.room.id){
                    acts.push(frBtn('🚪 加入','primary',async b=>{
                        b.disabled=true;
                        try{ await roomJoin(f.room.id); }
                        catch(e){ alert(e.message); b.disabled=false; }
                    }));
                }
                acts.push(chat,del);
                const row=frRow(f,'@'+f.username+(f.room&&f.room.id?' · 🎮 房间 '+f.room.id:'')+(f.unread?' · '+f.unread+' 条未读':''),acts);
                row.style.cursor='pointer';
                row.addEventListener('click',()=>chatOpen(f.pid,displayName(f)));
                list.appendChild(row);
            });

            const incList=document.getElementById('frIncomingList');
            if(incList){
                incList.innerHTML='';
                (friendsCache.incoming||[]).forEach(f=>{
                    const accept=frBtn('接受','primary',async b=>{ b.disabled=true; try{ await authApi('/friends/accept',{method:'POST',body:{pid:f.pid}}); friendsLoad(); }catch(e){ alert(e.message); b.disabled=false; } });
                    const reject=frBtn('拒绝','',async b=>{ b.disabled=true; try{ await authApi('/friends/reject',{method:'POST',body:{pid:f.pid}}); friendsLoad(); }catch(e){ alert(e.message); b.disabled=false; } });
                    incList.appendChild(frRow(f,'请求加你为好友',[accept,reject]));
                });
                if(!(friendsCache.incoming||[]).length){ const e=document.createElement('div'); e.className='fr-empty'; e.textContent='暂无新的好友申请'; incList.appendChild(e); }
            }
            const outList=document.getElementById('frOutgoingList');
            if(outList){
                outList.innerHTML='';
                (friendsCache.outgoing||[]).forEach(f=>{
                    const cancel=frBtn('撤回','',async b=>{ b.disabled=true; try{ await authApi('/friends/'+encodeURIComponent(f.pid),{method:'DELETE'}); friendsLoad(); }catch(e){ alert(e.message); b.disabled=false; } });
                    outList.appendChild(frRow(f,'等待对方接受',[cancel]));
                });
                if(!(friendsCache.outgoing||[]).length){ const e=document.createElement('div'); e.className='fr-empty'; e.textContent='暂无已发送的申请'; outList.appendChild(e); }
            }
        }
        function friendsSetTab(tab){
            friendsTab=tab;
            [['list','btnFrTabList','frListView'],['req','btnFrTabReq','frReqView'],['add','btnFrTabAdd','frAddView']].forEach(p=>{
                const b=document.getElementById(p[1]); if(b) b.classList.toggle('active',p[0]===tab);
                const v=document.getElementById(p[2]); if(v) v.style.display=p[0]===tab?'':'none';
            });
        }
        function friendsOpen(){
            if(!authUser){ authErr('请先登录后使用好友功能'); showScreen(document.getElementById('screenAccount')); return; }
            friendsSetTab('list');
            showScreen(document.getElementById('screenFriends'));
            friendsLoad().catch(e=>{
                const empty=document.getElementById('frEmpty'); if(empty){ empty.textContent=e.message; empty.style.display=''; }
            });
        }
        async function friendsSearch(){
            const q=(document.getElementById('frSearchInput').value||'').trim();
            const list=document.getElementById('frSearchList'), empty=document.getElementById('frSearchEmpty');
            if(!q){ if(empty){ empty.textContent='输入账号或昵称搜索玩家'; empty.style.display=''; } if(list) list.innerHTML=''; return; }
            if(list) list.innerHTML='';
            if(empty){ empty.textContent='搜索中…'; empty.style.display=''; }
            try{
                const d=await authApi('/users/search?q='+encodeURIComponent(q));
                if(list) list.innerHTML='';
                const users=d.users||[];
                if(empty){ empty.textContent='没有找到相关玩家'; empty.style.display=users.length?'none':''; }
                users.forEach(u=>{
                    let actions=[];
                    if(u.relation==='none'){
                        actions=[frBtn('加好友','primary',async b=>{ b.disabled=true; try{ await authApi('/friends/request',{method:'POST',body:{pid:u.pid}}); friendsLoad(); friendsSearch(); }catch(e){ alert(e.message); b.disabled=false; } })];
                    } else if(u.relation==='outgoing'){
                        actions=[frBtn('已申请','',()=>{})];
                    } else if(u.relation==='incoming'){
                        actions=[frBtn('接受','primary',async b=>{ b.disabled=true; try{ await authApi('/friends/accept',{method:'POST',body:{pid:u.pid}}); friendsLoad(); friendsSearch(); }catch(e){ alert(e.message); b.disabled=false; } }),frBtn('拒绝','',async b=>{ b.disabled=true; try{ await authApi('/friends/reject',{method:'POST',body:{pid:u.pid}}); friendsLoad(); friendsSearch(); }catch(e){ alert(e.message); b.disabled=false; } })];
                    } else {
                        actions=[frBtn('已是好友','',()=>{})];
                    }
                    if(list) list.appendChild(frRow(u,u.relation==='friend'?'已是好友':('@'+u.username),actions));
                });
            }catch(e){ if(empty){ empty.textContent=e.message; empty.style.display=''; } }
        }

        // ---------- 聊天 ----------
        function chatTime(ts){ const d=new Date((ts||0)*1000); const p=n=>String(n).padStart(2,'0'); return p(d.getHours())+':'+p(d.getMinutes()); }
        async function chatOpen(pid,name){
            if(!authUser) return;
            chatPid=pid; chatName=name||''; chatLastId=0;
            const t=document.getElementById('chatTitle'); if(t) t.textContent='💬 '+chatName;
            const box=document.getElementById('chatMsgs'); if(box) box.innerHTML='<div class="chat-empty">加载中…</div>';
            showScreen(document.getElementById('screenChat'));
            try{ await chatLoad(true); }catch(e){ if(box){ box.innerHTML=''; const d=document.createElement('div'); d.className='chat-empty'; d.textContent=e.message; box.appendChild(d); } }
            clearInterval(chatTimer);
            chatTimer=setInterval(()=>{ if(document.getElementById('screenChat').classList.contains('active')) chatLoad(false).catch(()=>{}); },3000);
        }
        async function chatLoad(reset){
            if(!authUser||!chatPid) return;
            const d=await authApi('/messages?with='+encodeURIComponent(chatPid)+(chatLastId?'&after='+chatLastId:''));
            const list=d.messages||[];
            const box=document.getElementById('chatMsgs'); if(!box) return;
            if(reset) box.innerHTML='';
            if(!list.length && reset){ const e=document.createElement('div'); e.className='chat-empty'; e.textContent='还没有消息，打个招呼吧'; box.appendChild(e); }
            if(list.length){ const e=box.querySelector('.chat-empty'); if(e) e.remove(); }
            list.forEach(m=>{
                chatLastId=Math.max(chatLastId,m.id);
                const row=document.createElement('div'); row.className='msg-row '+(m.from_pid===authUser.pid?'mine':'theirs');
                const b=document.createElement('div'); b.className='msg-bubble'; b.textContent=m.body;
                const t=document.createElement('span'); t.className='msg-time'; t.textContent=chatTime(m.created_at); b.appendChild(t);
                row.appendChild(b); box.appendChild(row);
            });
            if(list.length) box.scrollTop=box.scrollHeight;
            friendsRefreshBadge();
        }
        function chatError(msg){
            const box=document.getElementById('chatMsgs'); if(!box) return;
            const e=document.createElement('div'); e.className='chat-empty'; e.style.color='#ff6b6b'; e.textContent=msg;
            box.appendChild(e); box.scrollTop=box.scrollHeight;
            setTimeout(()=>{ if(e.parentNode) e.parentNode.removeChild(e); },2600);
        }
        async function chatSend(){
            if(!authUser||!chatPid) return;
            const inp=document.getElementById('chatInput'); if(!inp) return;
            const v=(inp.value||'').trim();
            if(!v) return;
            if(v.length>500) return chatError('消息不能超过 500 字');
            const btn=document.getElementById('btnChatSend'); if(btn&&btn.disabled) return; if(btn) btn.disabled=true;
            try{ await authApi('/messages',{method:'POST',body:{to:chatPid,body:v}}); inp.value=''; await chatLoad(false); }
            catch(e){ chatError(e.message); }
            finally{ if(btn) btn.disabled=false; }
        }

        // ============ 联机房间（WebRTC 点对点直连 + D1 轮询中继自动降级） ============
        let onlineRoom=null, onlineRoomId='', onlineStarted=false, onlineEnded=false, onlineHost=false;
        let netGuest=false, remoteEnt=null, netPendingOffer='', netPendingAnswer='';
        let onlinePollTimer=null, onlinePollAfter=0, onlinePollMs=800, onlinePolling=false, onlineClosing=false;
        let netPc=null, netDc=null, netMode='', netFallbackTimer=null;
        let netWs=null, netWsReady=false, netWsTimer=null, netWsRetry=0;
        let netState={seq:0,lastStateAt:0,lastInputAt:0,lastRecvAt:0,lastDamageAt:0};

        function roleById(id){
            if(!id) return null;
            for(const r of ROLES){
                if(r.id===id) return r;
                for(const s of (r.spawnRoles||[])) if(s.id===id) return s;
            }
            if(EMPEROR_ROLE.id===id) return EMPEROR_ROLE;
            for(const r of PARENT_ROLES) if(r.id===id) return r;
            if(FUQIN_ROLE.id===id) return FUQIN_ROLE;
            return null;
        }
        function onlineScreenActive(){ const el=document.getElementById('screenRoom'); return !!(el&&el.classList.contains('active')); }
        function onlineBadge(text){
            const el=document.getElementById('netBadge'); if(!el) return;
            if(!text){ el.style.display='none'; el.textContent=''; return; }
            el.textContent=text; el.style.display='';
        }
        function onlineResetLocal(){
            onlineStarted=false; onlineEnded=false; onlineHost=false; netGuest=false; remoteEnt=null;
            netPendingOffer=''; netPendingAnswer='';
            _lastGuestTs=0;
            for(const k in netInputTs) delete netInputTs[k];
            netState={seq:0,lastStateAt:0,lastInputAt:0,lastRecvAt:0,lastDamageAt:0};
        }

        // ---------- 网络通道（P2P 直连 → WebSocket 中继 → 数据库轮询） ----------
        function netClose(){
            if(netFallbackTimer){ clearTimeout(netFallbackTimer); netFallbackTimer=null; }
            if(netWsTimer){ clearTimeout(netWsTimer); netWsTimer=null; }
            if(netWs){ const w=netWs; netWs=null; try{ w.onclose=null; w.close(); }catch(e){} }
            netWsReady=false; netWsRetry=0;
            try{ if(netDc) netDc.close(); }catch(e){}
            try{ if(netPc) netPc.close(); }catch(e){}
            netDc=null; netPc=null; netMode=''; onlineBadge('');
        }
        function netSlowLabel(){ return netWsReady?'⚡ 中继':'📡 数据库'; }
        function netSyncBadge(){
            onlineBadge(netMode==='p2p'?'🌐 直连':netSlowLabel());
            onlinePollSet(netMode==='p2p'?2000:(netWsReady?1500:120));
        }
        // WebSocket 中继：向 Pages 申请一次性票据，连上后消息不再经过数据库
        function netRelayConnect(){
            if(!onlineStarted||onlineEnded||!onlineRoomId||!authToken) return;
            authApi('/rooms/ticket',{method:'POST'}).then(d=>{
                if(!onlineStarted||onlineEnded||!onlineRoomId||netWs) return;
                const base=String((d&&d.url)||'').replace(/^http/i,'ws').replace(/\/+$/,'');
                if(!base||!d.ticket){ netRelayRetry(); return; }
                let ws;
                try{ ws=new WebSocket(base+'/room/'+encodeURIComponent(onlineRoomId)+'?ticket='+encodeURIComponent(d.ticket)); }
                catch(e){ netRelayRetry(); return; }
                netWs=ws;
                ws.onopen=()=>{
                    if(netWs!==ws) return;
                    netWsReady=true; netWsRetry=0;
                    if(netMode!=='p2p') netSyncBadge();
                };
                ws.onmessage=ev=>{ if(netWs!==ws) return; try{ const m=JSON.parse(ev.data); if(m&&m.t) handleNetGame(m); }catch(e){} };
                ws.onclose=()=>{
                    if(netWs!==ws) return;
                    netWs=null; netWsReady=false;
                    if(!onlineStarted||onlineEnded) return;
                    netSyncBadge();
                    netRelayRetry();
                };
                ws.onerror=()=>{ try{ ws.close(); }catch(e){} };
            }).catch(()=>{ netRelayRetry(); });
        }
        function netRelayRetry(){
            if(!onlineStarted||onlineEnded||!onlineRoomId||!authToken) return;
            if(netWsTimer||netWsReady||netWs) return;
            netWsRetry++;                    // 不设上限：中继恢复后自动切回 ⚡，期间数据库轮询兜底
            netWsTimer=setTimeout(()=>{ netWsTimer=null; netRelayConnect(); },Math.min(8000,600*netWsRetry));
        }
        function netSupported(){ return typeof RTCPeerConnection!=='undefined'; }
        function netWaitIce(pc){
            return new Promise(res=>{
                if(pc.iceGatheringState==='complete') return res();
                let done=false;
                const fin=()=>{ if(done) return; done=true; clearTimeout(t); pc.removeEventListener('icegatheringstatechange',on); res(); };
                const on=()=>{ if(pc.iceGatheringState==='complete') fin(); };
                const t=setTimeout(fin,2500);
                pc.addEventListener('icegatheringstatechange',on);
            });
        }
        function netSetupDc(dc){
            netDc=dc;
            dc.onopen=()=>{
                netMode='p2p';
                if(netFallbackTimer){ clearTimeout(netFallbackTimer); netFallbackTimer=null; }
                netSyncBadge();
            };
            dc.onmessage=ev=>{ try{ handleNetGame(JSON.parse(ev.data)); }catch(e){} };
            dc.onclose=()=>{ netDcDrop(); };
        }
        function netDcDrop(){
            if(netMode!=='p2p') return;
            try{ if(netDc) netDc.close(); }catch(e){}
            netDc=null; netMode='relay';
            netSyncBadge();
            if(!netWsReady) netRelayRetry();
        }
        function netWatchIce(pc){
            pc.oniceconnectionstatechange=()=>{
                const st=pc.iceConnectionState;
                if(st==='failed'){ netDcDrop(); return; }
                // disconnected 可能是手机网络瞬断，给 4 秒自愈时间，避免一抖就永久掉到慢速中继
                if(st==='disconnected') setTimeout(()=>{
                    if(netPc===pc&&pc.iceConnectionState!=='connected'&&pc.iceConnectionState!=='completed') netDcDrop();
                },4000);
            };
        }
        const NET_ICE={ iceServers:[{urls:['stun:stun.cloudflare.com:3478','stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun.miwifi.com:3478']}] };
        async function netConnect(){
            netClose();
            netMode='relay';
            netSyncBadge();                  // 先显示真实通道（📡 数据库 → WS 通了变 ⚡ 中继）
            onlinePollStart(120);            // 数据库轮询先兜底，保证一定能打
            netRelayConnect();               // 同时建立 WebSocket 中继（通常 200ms 内可用）
            if(!netSupported()) return;
            netFallbackTimer=setTimeout(()=>{
                netFallbackTimer=null;
                if(netMode==='p2p') return;
                try{ if(netPc) netPc.close(); }catch(e){}
                netPc=null; netDc=null; netMode='relay';
                netSyncBadge();
            },8000);
            if(!onlineHost) return;          // 客机等房主的 offer
            try{
                const pc=new RTCPeerConnection(NET_ICE); netPc=pc;
                // 状态/输入都是"过期即弃"的数据，不开重传，避免丢包时排队阻塞造成越打越卡
                netSetupDc(pc.createDataChannel('kpdj',{ordered:true,maxRetransmits:0}));
                netWatchIce(pc);
                const offer=await pc.createOffer();
                await pc.setLocalDescription(offer);
                await netWaitIce(pc);
                if(netPc!==pc) return;
                await authApi('/rooms/signal',{method:'POST',body:{kind:'offer',payload:JSON.stringify(pc.localDescription)}});
            }catch(e){ if(netMode!=='p2p') netSyncBadge(); }
        }
        async function netOnOffer(payload){
            if(!onlineStarted||onlineHost||netPc) return;
            try{
                const pc=new RTCPeerConnection(NET_ICE); netPc=pc;
                pc.ondatachannel=ev=>netSetupDc(ev.channel);
                netWatchIce(pc);
                await pc.setRemoteDescription(JSON.parse(payload));
                const answer=await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await netWaitIce(pc);
                if(netPc!==pc) return;
                await authApi('/rooms/signal',{method:'POST',body:{kind:'answer',payload:JSON.stringify(pc.localDescription)}});
            }catch(e){}
        }
        async function netOnAnswer(payload){
            if(!onlineHost||!netPc) return;
            try{ await netPc.setRemoteDescription(JSON.parse(payload)); }catch(e){}
        }
        const netInputTs={};
        function netSendInput(extra){
            const q=++netState.seq, now=performance.now();
            netInputTs[q]=now;
            const keys=Object.keys(netInputTs);
            if(keys.length>80) for(let i=0;i<keys.length-80;i++) delete netInputTs[keys[i]];
            netSend(Object.assign({t:'i',m:[joyMove.x,joyMove.y],q},extra||{}));
        }
        function netShowLatency(){
            if(!battleActive||onlineEnded||!netState.rtt) return;
            const now=performance.now();
            if(now-(netState.rttAt||0)<600) return;
            netState.rttAt=now;
            onlineBadge((netMode==='p2p'?'🌐 直连':netSlowLabel())+' · '+Math.round(netState.rtt)+'ms');
        }
        function netSend(obj){
            if(!onlineRoomId||!authToken) return;
            let s; try{ s=JSON.stringify(obj); }catch(e){ return; }
            const kind=obj.t==='s'?'state':(obj.t==='i'?'input':(obj.t==='e'?'end':'ping'));
            // 结束时同时走中继，直连即使丢包也能保证对方收到结算
            if(kind==='end') authApi('/rooms/msg',{method:'POST',body:{kind,payload:s}}).catch(()=>{});
            if(netDc&&netDc.readyState==='open'){
                // 发送队列堆积说明网络在堵，状态/输入直接丢（下一帧会有更新的），避免延迟越积越高
                if(kind!=='end'&&netDc.bufferedAmount>8192) return;
                try{ netDc.send(s); return; }catch(e){}
            }
            if(netWsReady&&netWs&&netWs.readyState===1){
                if(kind!=='end'&&netWs.bufferedAmount>16384) return;
                try{ netWs.send(s); return; }catch(e){}
            }
            if(kind==='end') return;
            authApi('/rooms/msg',{method:'POST',body:{kind,payload:s}}).catch(()=>{});
        }
        function handleNetGame(m){
            if(!m||!onlineStarted) return;
            if(m.t==='s'){ if(!onlineHost) netApplyStateObject(m.d); }
            else if(m.t==='i'){ if(onlineHost) applyGuestInputObject(m); }
            else if(m.t==='e'){ if(!onlineHost) guestFinish(m.w||''); }
        }
        function handleRoomMessage(kind,payload,viaPoll){
            if(kind==='offer'){ if(onlineHost) return; if(!onlineStarted){ netPendingOffer=payload; return; } netOnOffer(payload); return; }
            if(kind==='answer'){ if(!onlineHost) return; if(!onlineStarted){ netPendingAnswer=payload; return; } netOnAnswer(payload); return; }
            if(!onlineStarted||!payload) return;
            try{
                // WebSocket 中继已通时，数据库里的旧输入/快照直接丢弃，避免两路数据互相打断插值
                if(kind==='input'){ if(onlineHost&&!(viaPoll&&netWsReady)) applyGuestInputObject(JSON.parse(payload)); }
                else if(kind==='state'){ if(!onlineHost&&!(viaPoll&&netWsReady)) netApplyStateObject((JSON.parse(payload)||{}).d); }
                else if(kind==='end'){ if(!onlineHost) guestFinish((JSON.parse(payload)||{}).w||''); }
            }catch(e){}
        }
        function applyGuestInputObject(d){
            if(!d||!onlineHost||!battleActive||!remoteEnt||remoteEnt.hp<=0) return;
            netState.lastInputAt=performance.now();
            if(d.q) netState.ack=d.q;                  // 回显给客机测延迟
            const m=d.m||[0,0];
            remoteEnt.netMove={x:Number(m[0])||0,y:Number(m[1])||0};
            if(typeof d.s==='number'&&!isNaN(d.s)){
                const now=performance.now();
                if(now>=remoteEnt.frozenUntil && now-remoteEnt.lastSkillTime>=remoteEnt.role.skillInterval){
                    remoteEnt.lastSkillTime=now;
                    fireSkill(remoteEnt,d.s);
                }
            }
        }

        // ---------- 房主权威快照 ----------
        function serializeNetState(){
            const now=performance.now();
            return {
                a:netState.ack||0,
                e:entities.map(e=>({
                    u:e.uid,r:e.role.id,o:e.owner,
                    x:Math.round(e.x*10)/10,y:Math.round(e.y*10)/10,
                    h:Math.max(0,Math.round(e.hp*10)/10),m:e.maxHp,
                    c:e.charging?e.charging.uid:0,
                    f:e.flashTimer>0?1:0,
                    z:Math.max(0,Math.round(e.frozenUntil-now)),
                    v:Math.max(0,Math.round(e.invincibleUntil-now))
                })),
                p:projectiles.map(p=>({x:Math.round(p.x),y:Math.round(p.y),t:p.type,s:p.size,c:p.color,e:p.emoji||'',
                    vx:Math.round(p.vx*10)/10,vy:Math.round(p.vy*10)/10}))
            };
        }
        function netMakeEnt(role,owner){
            return {role,owner,x:arenaSize/2,y:arenaSize/2,vx:0,vy:0,hp:role.hp,maxHp:role.hp,size:role.size,
                lastSkillTime:0,flashTimer:0,frozenUntil:0,lastFrozenTick:0,isEmperor:role.id==='emperor',summoner:null,
                frozenLabelEl:null,isParent:false,mother:null,parentAtkUntil:0,liukunAtkUntil:0,chargeTimer:0,charging:null,
                lastSecondTime:0,revived:false,invincibleUntil:0,spawnTimer:0,uid:++uidCounter,hudFillEl:null,hudTextEl:null,
                isManual:false,isRemote:true,netMove:{x:0,y:0},netTX:null,netTY:null,netT:0,netPX:null,netPY:null,netPT:0,_hu:0};
        }
        function netApplyStateObject(d){
            if(!d||!d.e||!netGuest||!battleActive) return;
            const now=performance.now();
            netState.lastRecvAt=now;
            if(d.a&&netInputTs[d.a]){
                netState.rtt=now-netInputTs[d.a];
                for(const k in netInputTs){ if(+k<=d.a) delete netInputTs[k]; }
            }
            const old=entities, used=new Set(), next=[];
            d.e.forEach(sd=>{
                const role=roleById(sd.r);
                if(!role) return;
                let e=null;
                for(const o of old){ if(used.has(o)) continue; if(o.uid===sd.u&&o.role.id===sd.r&&o.owner===sd.o){ e=o; break; } }
                if(!e){ for(const o of old){ if(used.has(o)) continue; if(o.owner===sd.o&&o.role.id===sd.r){ e=o; break; } } }
                if(!e) e=netMakeEnt(role,sd.o);
                used.add(e);
                const prevHp=e.hp;
                e._hu=sd.u;
                // 保留上一帧快照位置，渲染时按时间在两个快照之间插值，彻底消除 16Hz 跳格
                if(e.netTX!=null&&e.netT){
                    e.netPX=e.netTX; e.netPY=e.netTY; e.netPT=e.netT;
                }else{
                    e.netPX=e.x; e.netPY=e.y; e.netPT=now-50;
                }
                e.netTX=sd.x; e.netTY=sd.y; e.netT=now;
                if(e!==manualEnt&&(Math.abs(e.x-sd.x)>90||Math.abs(e.y-sd.y)>90)){ e.x=sd.x; e.y=sd.y; }
                e.hp=sd.h; e.maxHp=sd.m;
                e.flashTimer=sd.f?120:0;
                e.frozenUntil=sd.z>0?now+sd.z:0;
                e.invincibleUntil=sd.v>0?now+sd.v:0;
                e._cu=sd.c||0;
                if(e.hp<prevHp-0.5&&e.hp>=0){
                    const dmg=Math.round(prevHp-e.hp);
                    if(dmg>0){ spawnDamagePop(e.x,e.y,dmg); spawnParticles(e.x,e.y,'#ff5555',Math.min(12,4+dmg)); }
                    if(now-netState.lastDamageAt>180){ netState.lastDamageAt=now; sfxHit(); }
                }
                next.push(e);
            });
            if(!next.length) return;
            next.forEach(e=>{
                if(e._cu){ const t=next.find(x=>x._hu===e._cu); e.charging=t&&t!==e?t:null; }
                else e.charging=null;
            });
            entities=next;
            // 投射物：按类型就近复用上一帧对象，保留速度做本地外推，避免每 50ms 瞬移一次
            const prevP=projectiles;
            projectiles=(d.p||[]).map(pd=>{
                let best=null,bd=1e9;
                for(const o of prevP){
                    if(o.type!==pd.t||o._used) continue;
                    const dd=Math.hypot((o.netTX!=null?o.netTX:o.x)-pd.x,(o.netTY!=null?o.netTY:o.y)-pd.y);
                    if(dd<bd){ bd=dd; best=o; }
                }
                if(best&&bd<140){
                    best._used=true;
                    best.netTX=pd.x; best.netTY=pd.y; best.netT=now;
                    best.vx=pd.vx||0; best.vy=pd.vy||0;
                    return best;
                }
                return {x:pd.x,y:pd.y,vx:pd.vx||0,vy:pd.vy||0,type:pd.t,size:pd.s,color:pd.c,emoji:pd.e||'🚗',born:now,netTX:pd.x,netTY:pd.y,netT:now};
            });
            projectiles.forEach(p=>{ p._used=false; });
            netShowLatency();
        }
        function onlineHostTick(){
            if(!onlineStarted||!onlineHost||onlineEnded||!battleActive) return;
            const now=performance.now();
            if(!netState.lastInputAt) netState.lastInputAt=now;
            if(now-netState.lastInputAt>15000){ onlineEnded=true; onlineAbort('对方已断开连接'); return; }
            if(remoteEnt&&remoteEnt.hp>0&&now-netState.lastInputAt>600){ remoteEnt.netMove={x:0,y:0}; }
            const iv=netMode==='p2p'?45:(netWsReady?50:120);
            if(now-netState.lastStateAt<iv) return;
            netState.lastStateAt=now;
            netSend({t:'s',d:serializeNetState()});
        }
        function onlineHostEnd(alive){
            if(onlineEnded) return;
            onlineEnded=true;
            const winner=alive.length?(alive.find(e=>!e.isEmperor)||alive[0]):null;
            const w=winner?(winner.owner==='player1'?'player1':'player2'):'';
            netSend({t:'e',w:w});
            setTimeout(()=>{ if(onlineEnded) netSend({t:'e',w:w}); },350);
            onlineBadge('已结束');
            onlinePollStop();
        }

        // ---------- 客机：本地预测 + 快照插值 ----------
        let _lastGuestTs=0;
        function guestTick(ts){
            if(!battleActive) return;
            animationId=requestAnimationFrame(gameLoop);
            const now=performance.now();
            const dt=_lastGuestTs?Math.min(3,Math.max(0.25,(ts-_lastGuestTs)/16.6667)):1;
            _lastGuestTs=ts;
            const spd=2.6*dt;
            if(manualEnt&&manualEnt.hp>0&&performance.now()>=manualEnt.frozenUntil&&!(manualEnt.role.id==='liukun'&&manualEnt.charging)){
                manualEnt.vx=joyMove.x*spd; manualEnt.vy=joyMove.y*spd;
                manualEnt.x+=manualEnt.vx; manualEnt.y+=manualEnt.vy;
                const m=15, half=manualEnt.size/2;
                if(manualEnt.x-half<m) manualEnt.x=m+half;
                if(manualEnt.x+half>arenaSize-m) manualEnt.x=arenaSize-m-half;
                if(manualEnt.y-half<m) manualEnt.y=m+half;
                if(manualEnt.y+half>arenaSize-m) manualEnt.y=arenaSize-m-half;
                if(manualEnt.netTX!=null){
                    const dx=manualEnt.netTX-manualEnt.x, dy=manualEnt.netTY-manualEnt.y;
                    const err=Math.hypot(dx,dy);
                    // 自己是本地权威：房主快照永远比本地慢一个网络延迟，若每帧往快照回拉会把移动"抵消"成原地抖
                    // 只在误差明显超出延迟正常范围时才硬对齐（被击退/传送），中等误差做极轻微修正
                    if(err>140){ manualEnt.x=manualEnt.netTX; manualEnt.y=manualEnt.netTY; }
                    else if(err>90){ const k=Math.min(1,0.08*dt); manualEnt.x+=dx*k; manualEnt.y+=dy*k; }
                }
            }
            // 远端实体：在最近两个快照之间按时间插值；中继模式快照更稀，缓冲加大并允许外推，避免一跳一跳
            const p2p=netMode==='p2p';
            const rt=now-(p2p?60:(netWsReady?80:150));
            entities.forEach(e=>{
                if(e===manualEnt||e.netTX==null) return;
                if(e.netPX!=null&&e.netT>e.netPT&&e.netPT>0){
                    const f=Math.max(0,Math.min(p2p?1.2:2,(rt-e.netPT)/Math.max(1,e.netT-e.netPT)));
                    e.x=e.netPX+(e.netTX-e.netPX)*f;
                    e.y=e.netPY+(e.netTY-e.netPY)*f;
                }else{
                    const k=Math.min(1,0.4*dt);
                    e.x+=(e.netTX-e.x)*k; e.y+=(e.netTY-e.y)*k;
                }
            });
            // 投射物：用快照速度本地外推 + 轻微回拉，消除 20Hz 瞬移
            projectiles.forEach(p=>{
                p.x+=p.vx*dt; p.y+=p.vy*dt;
                if(p.netTX!=null){
                    const age=Math.min(3,(now-p.netT)/16.6667);
                    const tx=p.netTX+p.vx*age, ty=p.netTY+p.vy*age;
                    const k=Math.min(1,0.25*dt);
                    p.x+=(tx-p.x)*k; p.y+=(ty-p.y)*k;
                }
            });
            for(let i=particles.length-1;i>=0;i--){ particles[i].x+=particles[i].vx; particles[i].y+=particles[i].vy; particles[i].life-=16*dt; if(particles[i].life<=0) particles.splice(i,1); }
            if(now-netState.lastInputAt>=(netMode==='p2p'?33:(netWsReady?50:100))){
                netState.lastInputAt=now;
                netSendInput();
            }
            if(manualEnt) updateSkillCooldown(ts);
            if(!onlineEnded&&netState.lastRecvAt&&now-netState.lastRecvAt>15000){
                onlineEnded=true; onlineAbort('与房主的连接已断开'); return;
            }
            render(); updateHUD();
            if(!onlineEnded&&manualEnt&&manualEnt.hp<=0&&now-netState.lastRecvAt>1500) guestFinish('');
        }
        function guestFinish(winner){
            if(onlineEnded) return;
            onlineEnded=true;
            if(!battleActive) return;
            battleActive=false; if(animationId) cancelAnimationFrame(animationId); animationId=null;
            const mine=manualEnt, foe=remoteEnt;
            render(); updateHUD();
            const endBtn=document.getElementById('btnEndBattle'); if(endBtn) endBtn.style.display='none';
            const rematchBtn=document.getElementById('btnRematch'); if(rematchBtn) rematchBtn.style.display='none';
            const resultEl=document.getElementById('battleResult');
            sfxWin();
            if(winner===''){
                if(resultEl) resultEl.textContent='💀 同归于尽！';
                showVictory('同归于尽 💀','💀','#888888');
            }else if(winner==='player2'){
                if(resultEl) resultEl.textContent='🏆 你获胜！';
                showVictory('🏆 你获胜！',mine?mine.role.avatar:'🏆',mine?mine.role.color:'#f0c060');
            }else{
                if(resultEl) resultEl.textContent='💀 你失败了';
                showVictory('💀 你失败了',foe?foe.role.avatar:'💀',foe?foe.role.color:'#888888');
            }
            onlineBadge('已结束');
            onlinePollStop();
        }
        // ---------- 房间页 ----------
        function roomFillPlayer(p,avId,nameId,roleId){
            const av=document.getElementById(avId), nm=document.getElementById(nameId), rl=document.getElementById(roleId);
            if(av){
                av.innerHTML='';
                if(p&&p.avatar){ const im=document.createElement('img'); im.src=p.avatar; im.alt=''; av.appendChild(im); }
                else av.textContent=p?String(p.nickname||p.username||'?').slice(0,1):'👤';
            }
            if(nm) nm.textContent=p?(p.nickname||p.username||'玩家'):'等待加入';
            if(rl){
                if(!p){ rl.textContent='--'; rl.classList.remove('picked'); }
                else if(p.role){ const r=roleById(p.role); rl.textContent=r?('✅ '+rn(r)):'✅ 已选'; rl.classList.add('picked'); }
                else { rl.textContent=p.picked?'✅ 已选':'未选'; rl.classList.toggle('picked',!!p.picked); }
            }
        }
        function renderRoom(room){
            if(!room) return;
            const codeEl=document.getElementById('roomCode'); if(codeEl) codeEl.textContent=room.id||'------';
            const st=document.getElementById('roomStatus');
            if(st){
                if(room.status==='waiting') st.textContent='⏳ 等待好友加入…把房间码发给好友，或让好友在好友列表点「加入」';
                else if(room.status==='picking') st.textContent='🃏 双方选角中，双方都选好后自动开战';
                else if(room.status==='battle') st.textContent='⚔️ 双方已选角，正在进入对战…';
                else st.textContent='房间已结束';
            }
            roomFillPlayer(room.host,'roomHostAvatar','roomHostName','roomHostRole');
            roomFillPlayer(room.guest,'roomGuestAvatar','roomGuestName','roomGuestRole');
            const list=document.getElementById('roomRoleList');
            if(list){
                if(!list.dataset.built){ list.dataset.built='1'; buildRoleCards(list,(card,role)=>roomPickRole(role)); }
                const me=room[room.you]||{};
                list.classList.toggle('locked',!!onlineStarted||room.status==='battle');
                list.querySelectorAll('.card-display').forEach(c=>c.classList.toggle('selected',!!me.role&&c.dataset.roleId===me.role));
            }
        }
        async function roomPickRole(role){
            if(!role||onlineStarted||!onlineRoom||onlineRoom.status==='battle') return;
            try{
                const d=await authApi('/rooms/role',{method:'POST',body:{roleId:role.id}});
                if(!d.room) return;
                onlineRoom=d.room; sfxClick(); renderRoom(d.room);
                if(d.room.status==='battle') startOnlineMatch(d.room);
            }catch(e){ alert(e.message); }
        }
        function roomEnter(room){
            onlineRoom=room; onlineRoomId=room.id; onlineClosing=false;
            onlineResetLocal();
            onlinePollAfter=0;
            renderRoom(room);
            showScreen(document.getElementById('screenRoom'));
            onlinePollStart(800);
        }
        async function roomCreate(){
            if(!authUser){ authErr('请先登录后使用联机房间'); showScreen(document.getElementById('screenAccount')); return; }
            try{
                const d=await authApi('/rooms/create',{method:'POST'});
                if(!d.room){ alert('创建房间失败'); return; }
                onlinePollStop(); netClose();
                onlineRoom=null; onlineRoomId=''; onlinePollAfter=0; onlineResetLocal();
                roomEnter(d.room); sfxClick();
            }catch(e){ alert(e.message); }
        }
        async function roomJoin(id){
            if(!authUser){ authErr('请先登录后使用联机房间'); showScreen(document.getElementById('screenAccount')); return; }
            try{
                const d=await authApi('/rooms/join',{method:'POST',body:{id:id}});
                if(!d.room){ alert('加入房间失败'); return; }
                onlinePollStop(); netClose();
                onlineRoom=null; onlineRoomId=''; onlinePollAfter=0; onlineResetLocal();
                roomEnter(d.room); sfxClick();
            }catch(e){ alert(e.message); }
        }
        async function roomsResume(){
            if(!authUser){ authErr('请先登录后使用联机房间'); showScreen(document.getElementById('screenAccount')); return; }
            try{
                const d=await authApi('/rooms/poll?after=0');
                if(d.room&&d.room.status!=='battle'){
                    roomEnter(d.room);
                    return;
                }
                if(d.room&&d.room.status==='battle'){
                    await authApi('/rooms/leave',{method:'POST'});
                    alert('上一场对战已中断，已退出房间');
                }
            }catch(e){}
            friendsOpen();
        }
        function roomLeave(){
            if(onlineClosing) return;
            onlineClosing=true;
            onlineExit();
            friendsOpen();
            setTimeout(()=>{ onlineClosing=false; },600);
        }
        function roomCopy(){
            if(!onlineRoomId) return;
            const done=()=>{ sfxClick(); const b=document.getElementById('btnRoomCopy'); if(b){ b.textContent='✅ 已复制'; setTimeout(()=>{ b.textContent='📋 复制'; },1400); } };
            try{
                if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(onlineRoomId).then(done,done);
                else { prompt('房间码：',onlineRoomId); }
            }catch(e){ prompt('房间码：',onlineRoomId); }
        }

        // ---------- 轮询（房间状态 + 中继消息） ----------
        function onlinePollStart(ms){
            onlinePollMs=ms||800;
            if(onlinePollTimer) clearInterval(onlinePollTimer);
            onlinePollTimer=setInterval(()=>{ onlinePollOnce(); },onlinePollMs);
            onlinePollOnce();
        }
        function onlinePollStop(){ if(onlinePollTimer){ clearInterval(onlinePollTimer); onlinePollTimer=null; } }
        function onlinePollSet(ms){ if(!onlinePollTimer||onlinePollMs===ms) return; onlinePollStart(ms); }
        // 轮询请求加超时：手机网络瞬断时 fetch 可能长时间挂起，卡住 onlinePolling 会让整局再无消息
        function pollFetch(path,ms){
            return new Promise((resolve,reject)=>{
                const t=setTimeout(()=>reject(new Error('poll timeout')),ms||7000);
                authApi(path).then(d=>{ clearTimeout(t); resolve(d); },e=>{ clearTimeout(t); reject(e); });
            });
        }
        async function onlinePollOnce(){
            if(!authUser||onlinePolling) return;
            if(!onlineRoomId&&!onlineScreenActive()) return;
            onlinePolling=true;
            try{
                const d=await pollFetch('/rooms/poll?after='+onlinePollAfter);
                if(!onlineRoomId) return;
                if(!d.room){
                    if(onlineStarted&&!battleActive){ onlinePollStop(); return; }
                    roomLost();
                    return;
                }
                onlineRoom=d.room; onlineRoomId=d.room.id;
                let lastState=null;
                (d.msgs||[]).forEach(m=>{
                    if(m.id>onlinePollAfter) onlinePollAfter=m.id;
                    if(m.from_pid===authUser.pid) return;
                    if(m.kind==='state'){ lastState=m.payload; return; }
                    handleRoomMessage(m.kind,m.payload,true);
                });
                if(lastState&&netGuest&&battleActive&&!netWsReady){ try{ netApplyStateObject((JSON.parse(lastState)||{}).d); }catch(e){} }
                if(onlineStarted){
                    if(d.room.status!=='battle'&&!onlineEnded) opponentLeft();
                }else if(d.room.status==='battle'){
                    startOnlineMatch(d.room);
                }else if(onlineScreenActive()){
                    renderRoom(d.room);
                }
            }catch(e){
                if(!onlineStarted&&onlineRoomId){ const el=document.getElementById('roomStatus'); if(el) el.textContent='网络不稳定，正在重试…'; }
            }finally{ onlinePolling=false; }
        }

        // ---------- 开局 / 结束 / 退出 ----------
        function startOnlineMatch(room){
            if(onlineStarted||!room) return;
            const hr=roleById(room.host&&room.host.role), gr=roleById(room.guest&&room.guest.role);
            if(!hr||!gr) return;
            onlineStarted=true; onlineEnded=false; onlineClosing=false;
            onlineHost=(room.you==='host'); netGuest=!onlineHost;
            onlineRoom=room; onlineRoomId=room.id;
            gameMode='online';
            showVSIntro([hr,gr],()=>{
                initBattle([hr,gr]);
                _lastGuestTs=0;
                netState.lastRecvAt=performance.now();
                netState.lastInputAt=performance.now();
                netState.lastStateAt=0; netState.seq=0;
                onlineBadge(onlineHost?'🔗 连接中…':'🔗 连接中…');
            });
            netConnect();
            if(netPendingOffer&&netGuest){ const p=netPendingOffer; netPendingOffer=''; netOnOffer(p); }
            if(netPendingAnswer&&onlineHost){ const p=netPendingAnswer; netPendingAnswer=''; netOnAnswer(p); }
        }
        function onlineExit(){
            const had=!!onlineRoomId;
            onlinePollStop();
            netClose();
            onlineRoom=null; onlineRoomId='';
            onlineResetLocal();
            if(had) authApi('/rooms/leave',{method:'POST'}).catch(()=>{});
        }
        function onlineAbort(msg){
            if(onlineClosing) return;
            onlineClosing=true;
            onlineExit();
            stopBattle();
            gameMode=null;
            setTimeout(()=>{ onlineClosing=false; },1000);
            if(msg) alert(msg);
            friendsOpen();
        }
        function roomLost(){ if(!onlineClosing) onlineAbort('房间已解散或你已不在房间中'); }
        function opponentLeft(){ if(!onlineEnded&&!onlineClosing){ onlineEnded=true; onlineAbort('对方已离开房间'); } }

        document.getElementById('btnRoomCreate').addEventListener('click',()=>{ sfxClick(); roomCreate(); });
        document.getElementById('btnRoomLeave').addEventListener('click',()=>{ sfxClick(); roomLeave(); });
        document.getElementById('btnRoomCopy').addEventListener('click',roomCopy);
        setInterval(()=>{
            if(!authUser||onlineStarted) return;
            if(!document.getElementById('screenFriends').classList.contains('active')) return;
            if(friendsTab!=='list') return;
            friendsLoad().catch(()=>{});
        },5000);
        window.addEventListener('beforeunload',()=>{
            if(!onlineRoomId||!authToken) return;
            try{ fetch('/api/rooms/leave',{method:'POST',headers:{authorization:'Bearer '+authToken},keepalive:true}); }catch(e){}
        });

        document.getElementById('btnAccount').addEventListener('click',()=>{ sfxClick(); authErr(''); authRender(); showScreen(document.getElementById('screenAccount')); });
        document.getElementById('btnAccountBack').addEventListener('click',()=>{ sfxClick(); showScreen(document.getElementById('screenMenu')); });
        document.getElementById('btnAccTabLogin').addEventListener('click',()=>{ sfxClick(); authSetMode('login'); });
        document.getElementById('btnAccTabReg').addEventListener('click',()=>{ sfxClick(); authSetMode('reg'); });
        document.getElementById('btnAccSubmit').addEventListener('click',authSubmit);
        document.getElementById('btnAccLogout').addEventListener('click',()=>{ sfxClick(); authSave('',null); authErr(''); friendsCache={friends:[],incoming:[],outgoing:[],unread:{total:0,by:{}}}; });
        document.getElementById('accPass').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); authSubmit(); } });
        document.getElementById('accPass2').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); authSubmit(); } });
        document.getElementById('accUser').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); document.getElementById('accPass').focus(); } });
        document.getElementById('btnAccSettings').addEventListener('click',()=>{ sfxClick(); accSettingsOpen(); });
        document.getElementById('btnAccountSetting').addEventListener('click',()=>{ sfxClick(); accSettingsOpen(); });
        document.getElementById('btnAccSettingsBack').addEventListener('click',()=>{ sfxClick(); showScreen(document.getElementById('screenSettings')); });
        document.getElementById('btnAsGoLogin').addEventListener('click',()=>{ sfxClick(); authErr(''); showScreen(document.getElementById('screenAccount')); });
        document.getElementById('btnAsUpload').addEventListener('click',()=>{ sfxClick(); document.getElementById('asFile').click(); });
        document.getElementById('asFile').addEventListener('change',e=>{ const f=e.target.files&&e.target.files[0]; asUploadAvatar(f); e.target.value=''; });
        document.getElementById('btnAsRemoveAvatar').addEventListener('click',asRemoveAvatar);
        document.getElementById('btnAsSaveNick').addEventListener('click',asSaveNickname);
        document.getElementById('btnAsSavePass').addEventListener('click',asSavePassword);
        document.getElementById('btnAsLogout').addEventListener('click',()=>{ sfxClick(); authSave('',null); friendsCache={friends:[],incoming:[],outgoing:[],unread:{total:0,by:{}}}; showScreen(document.getElementById('screenMenu')); });
        document.getElementById('asNickname').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); asSaveNickname(); } });
        document.getElementById('btnFriends').addEventListener('click',()=>{ sfxClick(); roomsResume(); });
        document.getElementById('btnFriendsBack').addEventListener('click',()=>{ sfxClick(); showScreen(document.getElementById('screenMenu')); });
        document.getElementById('btnFrTabList').addEventListener('click',()=>{ sfxClick(); friendsSetTab('list'); });
        document.getElementById('btnFrTabReq').addEventListener('click',()=>{ sfxClick(); friendsSetTab('req'); friendsLoad().catch(()=>{}); });
        document.getElementById('btnFrTabAdd').addEventListener('click',()=>{ sfxClick(); friendsSetTab('add'); });
        document.getElementById('btnFrSearch').addEventListener('click',friendsSearch);
        document.getElementById('frSearchInput').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); friendsSearch(); } });
        document.getElementById('btnChatSend').addEventListener('click',chatSend);
        document.getElementById('chatInput').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); chatSend(); } });
        document.getElementById('btnChatBack').addEventListener('click',()=>{ sfxClick(); clearInterval(chatTimer); showScreen(document.getElementById('screenFriends')); friendsLoad().catch(()=>{}); });
        setInterval(()=>{ if(authUser) friendsRefreshBadge(); },30000);
        // ============ 隐藏入口密码（FNV-1a 双轮加盐哈希，明文不落代码；以后加入口只需在 SECRETS 加一行 {h:哈希, fn:动作}） ============
        function fnv1a(s){ let h=0x811c9dc5; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,0x01000193); } return (h>>>0).toString(16).padStart(8,'0'); }
        function secretHash(s){ const a=fnv1a('kpdj_'+s+'_13!'); return a+fnv1a(a+'_13!'+s+'kpdj_'); }
        // 隐藏彩蛋图片：按扩展名依次尝试加载 public/images/01.*
        const _secretExts=['png','jpg','jpeg','gif','webp'];
        let _secretExtIdx=0;
        const secretImgOverlay=document.getElementById('secretImgOverlay'), secretImgEl=document.getElementById('secretImg'), secretImgTip=document.getElementById('secretImgTip');
        function secretImgLoad(){ secretImgEl.src='./images/01.'+_secretExts[_secretExtIdx]; }
        secretImgEl.addEventListener('load',()=>{ secretImgEl.style.display=''; if(secretImgTip) secretImgTip.style.display='none'; });
        secretImgEl.addEventListener('error',()=>{ if(_secretExtIdx<_secretExts.length-1){ _secretExtIdx++; secretImgLoad(); } else { secretImgEl.style.display='none'; if(secretImgTip) secretImgTip.style.display=''; } });
        function showSecretImg(){
            if(!secretImgOverlay) return;
            _secretExtIdx=0;
            if(secretImgTip) secretImgTip.style.display='none';
            secretImgEl.style.display='';
            secretImgLoad();
            secretImgOverlay.classList.remove('active'); void secretImgOverlay.offsetWidth; secretImgOverlay.classList.add('active');
            sfxClick();
        }
        if(secretImgOverlay) secretImgOverlay.addEventListener('click',()=>{ sfxClick(); secretImgOverlay.classList.remove('active'); });
        const SECRETS=[
            { h:'0815c6a90af4904a', fn:()=>{ try{ localStorage.setItem('lightUnlocked','1'); }catch(e){} applyLightSettings(); showScreen(document.getElementById('screenDev')); } }, // 开发者选项
            { h:'53205b891919f6e7', fn:()=>showSecretImg() } // 隐藏彩蛋：弹出图片文件夹里的 01
        ];
        const modalPwd=document.getElementById('modalPwd'), pwdInput=document.getElementById('pwdInput'), pwdErr=document.getElementById('pwdErr');
        function openPwdModal(){ pwdInput.value=''; pwdErr.textContent=''; pwdInput.classList.remove('shake'); modalPwd.classList.remove('active'); void modalPwd.offsetWidth; modalPwd.classList.add('active'); setTimeout(()=>pwdInput.focus(),250); }
        function closePwdModal(){ modalPwd.classList.remove('active'); pwdInput.value=''; pwdErr.textContent=''; pwdInput.classList.remove('shake'); }
        const authOkOverlay=document.getElementById('authOkOverlay');
        let authBusy=false, authTimer=0;
        function showAuthGranted(onDone){
            if(authBusy) return; authBusy=true;
            authOkOverlay.classList.remove('leave','show'); void authOkOverlay.offsetWidth;
            authOkOverlay.classList.add('show');
            playSound(660,'sine',0.1,0.2,990);
            setTimeout(()=>playSound(990,'sine',0.14,0.2,1320),180);
            setTimeout(()=>playSound(1320,'triangle',0.18,0.18),400);
            clearTimeout(authTimer);
            authTimer=setTimeout(()=>{
                authOkOverlay.classList.add('leave');
                setTimeout(()=>{
                    authOkOverlay.classList.remove('show','leave');
                    authBusy=false;
                    onDone&&onDone();
                },290);
            },1180);
        }
        function submitPwd(){
            if(authBusy) return;
            const hit=SECRETS.find(s=>secretHash(pwdInput.value.trim())===s.h);
            if(hit){
                closePwdModal();
                showAuthGranted(()=>hit.fn());
            }else{
                pwdErr.textContent='密码错误';
                pwdInput.classList.remove('shake'); void pwdInput.offsetWidth; pwdInput.classList.add('shake');
                playSound(140,'sawtooth',0.18,0.12,80);
                pwdInput.value=''; pwdInput.focus();
            }
        }
        document.getElementById('btnPwdOk').addEventListener('click',submitPwd);
        document.getElementById('btnPwdCancel').addEventListener('click',closePwdModal);
        modalPwd.addEventListener('click',function(e){ if(e.target===this) closePwdModal(); });
        pwdInput.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ e.preventDefault(); submitPwd(); } });
        let aboutClicks=0;
        document.getElementById('aboutVersion').addEventListener('click',()=>{
            aboutClicks++;
            if(aboutClicks>=10){
                aboutClicks=0;
                let unlocked=false; try{ unlocked=localStorage.getItem('lightUnlocked')==='1'; }catch(e){}
                if(unlocked){ sfxClick(); showScreen(document.getElementById('screenDev')); }
                else openPwdModal();
            } else { sfxClick(); }
        });
        document.getElementById('btnCloseRules').addEventListener('click',()=>document.getElementById('modalRules').classList.remove('active'));
        document.getElementById('modalRules').addEventListener('click',function(e){ if(e.target===this) this.classList.remove('active'); });
        document.getElementById('btnFreeMode').addEventListener('click',startFreeMode);
        document.getElementById('btnDualMode').addEventListener('click',startDualMode);
        document.getElementById('btnBRMode').addEventListener('click',startBRMode);
        document.getElementById('btnManualMode').addEventListener('click',startManualMode);
        document.getElementById('btnManualBack').addEventListener('click',goToModeSelect);
        document.getElementById('btnManualReset').addEventListener('click',startManualMode);
        document.getElementById('btnBackToMenu').addEventListener('click',goToMenu);
        document.getElementById('btnVictoryRematch').addEventListener('click',()=>rematch());
        document.getElementById('btnVictoryBack').addEventListener('click',()=>{ stopBattle(); goToMenu(); });
        document.getElementById('btnBackToMode').addEventListener('click',goToModeSelect);
        document.getElementById('btnBackToMode2').addEventListener('click',goToModeSelect);
        document.getElementById('btnBackToMode3').addEventListener('click',goToModeSelect);
        document.getElementById('btnFreeReset').addEventListener('click',()=>{ freeSelected={p1:null,p2:null}; updateFreeSelection(); });
        document.getElementById('btnStartBR').addEventListener('click',startBRBattle);
        document.getElementById('btnStartDualBattle').addEventListener('click',startDualBattle);
        document.getElementById('btnEndBattle').addEventListener('click',endBattle);
        document.getElementById('btnRematch').addEventListener('click',rematch);
        document.getElementById('drawCard1').addEventListener('click',()=>drawCard(1));
        document.getElementById('drawCard2').addEventListener('click',()=>drawCard(2));

        // ============ 初始化 ============
        (function createBg(){ const c=document.getElementById('bgParticles'); for(let i=0;i<25;i++){ const d=document.createElement('div'); d.className='bg-particle'; d.style.width=d.style.height=(2+Math.random()*3)+'px'; d.style.left=Math.random()*100+'%'; d.style.animationDuration=(5+Math.random()*10)+'s'; d.style.animationDelay=Math.random()*8+'s'; d.style.background=['#f0c060','#ff6b8a','#7dbfff','#c8a0ff','#00aaff'][Math.floor(Math.random()*5)]; c.appendChild(d); } })();
        initLightSense();
        initJoysticks();
        loadJoyLayout();
        initJoySettings();
        authInit();
        canvas=document.getElementById('battleCanvas'); ctx=canvas.getContext('2d'); arenaSize=Math.floor(Math.min(window.innerWidth*0.9,380)); canvas.width=arenaSize; canvas.height=arenaSize;
        window.addEventListener('resize',()=>{ applyJoyLayout(); if(battleActive){ if(gameMode==='online') return; const s=Math.floor(Math.min(window.innerWidth*0.9,380)); if(s!==arenaSize){ const r=s/arenaSize; arenaSize=s; canvas.width=arenaSize; canvas.height=arenaSize; entities.forEach(e=>{e.x*=r;e.y*=r;}); projectiles.forEach(p=>{p.x*=r;p.y*=r;}); } } });
    })();
