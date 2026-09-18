(function(){
'use strict';
const PREV=window.processReportSet||window.processWorkbook;
const S=v=>String(v??'').trim(), A=r=>S(r?.['Application number']);
function syncPrivate(E){
 try{
  if(typeof LOCAL==='undefined'||!LOCAL||LOCAL.snapshot!==E.snapshot||!Array.isArray(LOCAL.applications))return;
  const m=new Map(LOCAL.applications.map(a=>[A(a),a]).filter(x=>x[0]));
  E.apps=(E.apps||[]).map(a=>{const x=m.get(A(a));return x?{...a,...x}:a});
 }catch(e){}
}
async function enrichAndSync(E){
 try{const x=window.__applyPropertyContactMaster?.();if(x&&typeof x.then==='function')await x}catch(e){}
 syncPrivate(E);
 try{window.__applyFollowupContactSafety?.()}catch(e){}
 syncPrivate(E);
}
window.processReportSet=async function(){
 const out=await PREV.apply(this,arguments);
 const E=window.OTS7;
 if(!E?.loaded||!E.snapshot)return out;
 await enrichAndSync(E);
 const payload=window.__buildSharedPayload?.(E);
 if(!payload?.snapshot)throw Error('Final snapshot could not be built.');
 const now=new Date().toISOString();
 window.__applySharedPayload?.(payload,now,'local-saved',false);
 try{await window.OTS_AUTHORITY?.saveDetail?.(E)}catch(e){}
 try{
  const pub=await window.__publishSharedPayload(payload);
  window.__applySharedPayload?.(payload,pub.updated_at||new Date().toISOString(),'live',!!pub.is_final);
  try{await window.OTS_AUTHORITY?.saveDetail?.(E)}catch(e){}
  window.uploadMessage?.('Reports reconciled, saved and published successfully. Refresh will keep this report date.',true);
  document.dispatchEvent(new CustomEvent('ots:published',{detail:{payload,publish:pub}}));
  setTimeout(()=>window.closeReports?.(),650);
 }catch(e){
  console.error('Final publish failed',e);
  window.uploadMessage?.('Reports are calculated and saved on this browser, but live publish failed: '+String(e?.message||e)+'. Keep this tab and retry Submit after checking login/network.',false);
 }
 return out;
};
window.processWorkbook=window.processReportSet;
const b=document.querySelector('#reportModal .btn.primary');if(b)b.onclick=window.processReportSet;
})();