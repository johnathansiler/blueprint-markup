// bpm-v138: Menu as a grouped list (Job, Plan, Files, Settings). bpm-v141: the list sheet itself now lives in src/ui/15-toolbar-wheels.js and is used by
// every former wheel; this file only supplies the Menu's groups through window.listGroups(title,items) -> [[group name, [item indexes]], ...].
// bpm-v142: Finish inspection in Job, Address sweep in Plan.
// Classic script; shares the app's globals.
(()=>{
 const GR=[['Job',/^(New project|Open project file|Switch project|Rename project|Delete project|Start next inspection|Finish inspection)/],['Plan',/^(Open plan|Switch plan|Rename page|Delete plan|Address sweep)/],
  ['Files',/^(Save project file|Export|Share|Backup reminder|Save this job|Make saved photos)/],['Settings',/^(Reset screen zoom|Customize)/]];
 window.listGroups=(title,items)=>{if(title!=='Menu')return null;const used=new Set();
  const g=GR.map(([n,rx])=>[n,items.map((x,i)=>i).filter(i=>{const ok=!used.has(i)&&rx.test(items[i].l||'');if(ok)used.add(i);return ok})]);
  const rest=items.map((x,i)=>i).filter(i=>!used.has(i));if(rest.length)g[2][1].push(...rest);return g};
})();
