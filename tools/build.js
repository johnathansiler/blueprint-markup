#!/usr/bin/env node
// bpm-v139: ONE build for every hand-edited file. Edit files under src/, then run
//   node tools/build.js          rebuild dlg.js, app.js, ui.js and app.css (only files that changed are written)
//   node tools/build.js --check  exit 1 if any built file is out of date (used by test/v135-split.js)
// Files in each folder are joined in file-name order (the number in front sets the order). See CODEMAP.md.
//   src/boot -> dlg.js  small dialogs; must load before app.js
//   src/app  -> app.js  core (strict mode): state, storage, drawing, pin card, Detect, walk, files, tools, models
//   src/ui   -> ui.js   feature files that build on app.js (classic, non-strict, as before)
//   src/css  -> app.css every style sheet, theme colors first
// Why built files and not one script tag per file: the files share globals and change each other's functions while the page loads.
// One file per output keeps start-up order fixed (no timers or events can run in between).
const fs=require('fs'),path=require('path'),R=path.join(__dirname,'..');
const list=d=>fs.readdirSync(path.join(R,'src',d)).filter(n=>/^\d\d-.*\.(js|css)$/.test(n)).sort();
const read=(d,n)=>{const t=fs.readFileSync(path.join(R,'src',d,n),'utf8');if(!t.endsWith('\n'))throw new Error(`src/${d}/${n} must end with a newline`);return t.slice(0,-1)};
// ui.js: each feature file runs inside try/catch so that, as with separate script tags, a start-up error in one file is reported but does not stop the
// files after it. Files that declare shared top-level names (marked "@shared-globals" in their first lines) cannot be wrapped and are joined as they are.
const wrap=(n,t)=>/@shared-globals/.test(t.split('\n').slice(0,3).join('\n'))?t+'\n;':`try{\n${t}\n}catch(e){console.error('${n}',e);setTimeout(()=>{throw e})}`;
const OUT={
 'dlg.js':()=>list('boot').map(n=>read('boot',n)).join('\n')+'\n',
 'app.js':()=>list('app').map(n=>read('app',n)).join('\n'),
 'ui.js':()=>'// bpm-v139: built from src/ui by tools/build.js. Do not edit here.\n'+list('ui').map(n=>`// ===== src/ui/${n} =====\n`+wrap(n,read('ui',n))).join('\n')+'\n',
 'app.css':()=>'/* bpm-v139: built from src/css by tools/build.js. Do not edit here. */\n'+list('css').map(n=>`/* ===== src/css/${n} ===== */\n`+read('css',n)).join('\n')+'\n',
};
const check=process.argv.includes('--check');let stale=[];
for(const[f,make]of Object.entries(OUT)){const out=make(),p=path.join(R,f),cur=fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';
 if(cur===out)continue;if(check)stale.push(f);else{fs.writeFileSync(p,out);console.log('built '+f)}}
if(check){if(stale.length){console.error('out of date: '+stale.join(', ')+': run node tools/build.js');process.exit(1)}console.log('dlg.js, app.js, ui.js and app.css match src/');}
else console.log('build done');
