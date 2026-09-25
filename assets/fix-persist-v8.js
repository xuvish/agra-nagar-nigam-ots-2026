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
function applyCurrentChhattaWard(E){
 const roster=window.OTS_CHHATTA_OLD_WARD||{},ids=window.OTS_MASTER_WARDS||{};
 const correction=(a)=>{
  const id=String(a?.['Property UID']||a?.['Property ID']||a?.['Master property ID']||'').trim().toUpperCase();
  const x=ids[id];if(!x||x[0]!=='Chhatta'||x.length<4)return;
  a['Allocated zone']='Chhatta';a['Allocated ward']=x[1]+' '+x[2];a['Allocated RI / TC']=x[3];
  a['Allocation basis']='Exact Property ID · current Chhatta 25-ward roster';
 };
 for(const a of E.apps||[])correction(a);
 for(const p of E.payments||[]){
  const x=ids[String(p?.['Property UID']||'').trim().toUpperCase()];
  if(x?.[0]==='Chhatta'&&x.length>=4){p['Property zone']='Chhatta';p['Property ward']=x[1]+' '+x[2];p['Property RI']=x[3]}
 }
 for(const w of E.wardRows||[]){
  if(w.zone!=='Chhatta')continue;
  const x=roster[Number(w.wardNo)];if(!x)continue;
  w.wardNo=x[0];w.ward=x[1];w.ri=x[2];w.post='RI';
 }
 const fields=['applications','approved','inProcess','rejected','applicantPending','demand','receivedSummary','paidApplicants','receipts','collection'],byRI=new Map();
 for(const w of E.wardRows||[]){
  const key=w.zone+'|'+w.ri;
  let row=byRI.get(key);
  if(!row){row={zone:w.zone,ri:w.ri,post:w.post||'',wards:0};for(const f of fields)row[f]=0;byRI.set(key,row)}
  row.wards++;for(const f of fields)row[f]+=Number(w[f])||0;
 }
 if(byRI.size)E.riRows=[...byRI.values()].sort((a,b)=>a.zone.localeCompare(b.zone)||a.ri.localeCompare(b.ri));
 if(!window.__OTS_CHHATTA_ROSTER_UPGRADED&&Array.isArray(window.PUBLIC?.roster)){
  for(const w of window.PUBLIC.roster){if(w.zone!=='Chhatta')continue;const x=roster[Number(w.wardNo)];if(x){w.wardNo=x[0];w.ward=x[1];w.ri=x[2];w.post='RI'}}
  window.__OTS_CHHATTA_ROSTER_UPGRADED=true;
 }
}
async function enrichAndSync(E){
 try{const x=window.__applyPropertyContactMaster?.();if(x&&typeof x.then==='function')await x}catch(e){}
 syncPrivate(E);
 try{window.__applyFollowupContactSafety?.()}catch(e){}
 syncPrivate(E);
 applyCurrentChhattaWard(E);
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