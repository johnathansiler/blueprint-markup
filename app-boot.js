'use strict';
// bpm-v135: start-up, moved out of app.js so it runs after every app-*.js module has defined its functions (same start-up as before)
(async()=>{resize();try{await migratePanels()}catch(e){console.info('panel migration skipped',e)}await loadProject(await get('meta','project'))})();
