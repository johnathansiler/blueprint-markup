#!/usr/bin/env node
// bpm-v135: app.js is built from the modules in src/app (listed in src/app/ORDER).
// Edit the modules, then run:  node tools/build-app.js        (writes app.js)
//                              node tools/build-app.js --check (exit 1 if app.js is out of date)
// app.js stays one classic script at run time, so start-up order and behavior are exactly as before the split.
const fs=require('fs'),path=require('path'),R=path.join(__dirname,'..'),D=path.join(R,'src','app');
const order=fs.readFileSync(path.join(D,'ORDER'),'utf8').split('\n').map(s=>s.trim()).filter(Boolean);
const out=order.map(n=>{const t=fs.readFileSync(path.join(D,n),'utf8');if(!t.endsWith('\n'))throw new Error(n+' must end with a newline');return t.slice(0,-1)}).join('\n');
const cur=fs.existsSync(path.join(R,'app.js'))?fs.readFileSync(path.join(R,'app.js'),'utf8'):'';
if(process.argv.includes('--check')){if(cur!==out){console.error('app.js is out of date: run node tools/build-app.js');process.exit(1)}console.log('app.js matches src/app ('+order.length+' modules)');process.exit(0)}
if(cur!==out){fs.writeFileSync(path.join(R,'app.js'),out);console.log('app.js rebuilt from '+order.length+' modules')}else console.log('app.js already up to date');
