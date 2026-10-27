// bpm-v135/v139: dlg.js, app.js, ui.js and app.css must equal what tools/build.js makes from src/ (node test/v135-split.js)
const {execFileSync}=require('child_process'),path=require('path');
try{console.log(execFileSync('node',[path.join(__dirname,'..','tools','build.js'),'--check'],{encoding:'utf8'}).trim());console.log('ALLOK split')}catch(e){console.log(String(e.stdout||'')+String(e.stderr||''));console.log('FAILED split');process.exit(1)}
