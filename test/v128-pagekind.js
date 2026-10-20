// bpm-v128: Detect skips demolition plans and existing-conditions plans; new-work floor plans are still detected. Text-only fixtures (sheet titles as they appear in the title block, no plan data).
// usage: node test/v128-pagekind.js [path/to/pagekind.js]   -> prints ALLOK when every case passes (fails on bpm-v127).
'use strict';const fs=require('fs'),vm=require('vm'),path=require('path');
const src=fs.readFileSync(process.argv[2]||path.join(__dirname,'..','pagekind.js'),'utf8'),ctx={console,Map,Set};ctx.window=ctx;ctx.renderThumbs=function(){};vm.createContext(ctx);vm.runInContext(src,ctx);
const T=(s,sz,x,y)=>({str:s,transform:[sz,0,0,sz,x,y],height:sz});
// title block: "SHEET TITLE:" label, the title in bigger type just under it, the sheet number in big type
const sheet=(title,no)=>{const L=title.split('\n');return[T('SHEET TITLE:',6,3000,300),...L.map((l,i)=>T(l,10,3000,288-i*12)),T(no,22,3000,120),T('GENERAL NOTES',8,200,2000),T('1. ALL WORK SHALL COMPLY WITH NFPA 72.',6,200,1980)]};
const C=[
 ['GROUND FLOOR FIRE ALARM\nDEMOLITION PLAN','XFAS-200','demolition'],
 ['SECOND FLOOR AIR SAMPLING DETECTION\nDEMOLITION PLAN','XFAS-203','demolition'],
 ['FIRST FLOOR FIRE ALARM DEMOLITION PLAN (TSR AREA)','XFAS-201','demolition'],
 ['EXISTING OVERALL FIRE ALARM\nSITE PLAN','XFAS-200','existing'],
 ['GROUND FLOOR FIRE ALARM\nRENOVATION PLAN','FAS-200',null],
 ['SECOND FLOOR FIRE ALARM PLAN','FAS-201',null],
 ['FIRE ALARM DEMOLITION AND\nRENOVATION PLAN','FAS-202',null],
 ['EXISTING AND NEW FIRE ALARM PLAN','FAS-203',null],
 ['FIRE ALARM SYSTEM NAC RISER DIAGRAM','FAS-500','riser'],
 ['FACP BATTERY & VOLTAGE DROP CALCULATIONS','FAS-450','schedule'],
 ['FIRE DETECTION & ALARM INDEX SHEET','FAS-100','schedule'],
];
let bad=0;for(const [t,no,want] of C){const k=ctx.pageKindOf(sheet(t,no)),ok=(k.kind||null)===want;if(!ok)bad++;console.log(ok?'ok  ':'FAIL',JSON.stringify(t.replace(/\n/g,' ')),no,'->',k.kind,'(want',want+')',k.why)}
console.log(bad?`FAILED ${bad}/${C.length}`:'ALLOK');process.exitCode=bad?1:0;
