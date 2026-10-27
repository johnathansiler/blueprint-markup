// bpm-v138: Pins list rows get an Open card button (wraps renderList; the search and filter inputs still call the unwrapped renderList, as in v138).
// Classic script; shares the app's globals. by/ce: src/ui/00-helpers.js.
(()=>{
 // ---------- 8) Pins list: each row has Open card ----------
 const _rl=renderList;renderList=function(...a){const r=_rl.apply(this,a);const L=by('pinList');if(L)L.querySelectorAll('li[data-id]').forEach(li=>{if(li.querySelector('.pOpen'))return;
  const b=ce('button','btn pOpen','Open card');b.type='button';b.title='Open this pin’s card';b.onclick=async e=>{e.stopPropagation();const id=li.dataset.id;await jumpTo(plan.id,id);const p=pins.find(x=>x.id===id);if(p)openPin(p)};li.append(b)});return r};
})();
