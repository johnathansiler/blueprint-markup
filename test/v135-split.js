// bpm-v135: app.js must equal the modules in src/app joined in ORDER (node test/v135-split.js)
const {execFileSync}=require('child_process'),path=require('path');
try{console.log(execFileSync('node',[path.join(__dirname,'..','tools','build-app.js'),'--check'],{encoding:'utf8'}).trim());console.log('ALLOK split')}catch(e){console.log(String(e.stdout||'')+String(e.stderr||''));console.log('FAILED split');process.exit(1)}
