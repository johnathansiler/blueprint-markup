// bpm-v141: Cancel at the top of the Detect pop-up (like Save / Close at the top of the pin card). Closes it without running Detect.
(()=>{const d=by('detDlg'),h=d&&d.querySelector('#detForm>h3');if(!h)return;
 const row=ce('div','row detTopRow');h.replaceWith(row);row.append(h,ce('span','sp'));
 const b=ce('button','btn','Cancel');b.type='button';b.id='detCancelTop';b.title='Close without detecting';b.onclick=()=>d.close('cancel');row.append(b)})();
