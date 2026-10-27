// bpm-v143: phone mode (under 600px wide): the pin card's Delete sits in the card's top row, left of Close and Save,
// instead of floating above the card's corner, where it covered Menu in the top bar. Same button, same label and action.
(()=>{const D=by('pinDlg');if(!D)return;
 const place=()=>{const DB=D.querySelector('.pcDel')||document.querySelector('.pcDel');const row=D.querySelector('.pcTopRow');if(!DB||!row)return;
  if(innerWidth<600){const X=row.querySelector('button[value=cancel]');if(DB.parentElement!==row)row.insertBefore(DB,X);/* never start with Delete focused: Close keeps the focus it had before */if(D.open&&document.activeElement===DB)X&&X.focus()}else if(DB.parentElement!==D)D.append(DB)};
 new MutationObserver(()=>{place();setTimeout(place,0)}).observe(D,{attributes:true,attributeFilter:['open']});addEventListener('resize',place);place()})();
