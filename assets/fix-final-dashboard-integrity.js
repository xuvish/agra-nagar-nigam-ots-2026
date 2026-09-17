(function(){
'use strict';
const ZONES=['Chhatta','Hariparwat','Tajganj','Lohamandi'];
const RICH=3;
let privateCache=null,localPayload=null,restoring=false;
const N=v=>Number(v)||0;
const S=v=>String(v??'').trim();
const norm=v=>S(v).toLowerCase();
const appNo=r=>S(r?.['Application number']);
const approved=a=>norm(a?.['Application status'])==='approved';
const rejected=a=>/reject|cancel/.test(norm(a?.['Application status']));
const zoneOf=a=>{const z=S(a?.['Allocated zone']||a?._r?.zone);return ZONES.includes(z)?z:null};
const safeLocal=()=>{try{return typeof LOCAL!=='undefined'?LOCAL:null}catch(e){return null}};
function isoCmp(a,b){return S(a).localeCompare(S(b))}
function selectedZoneSafe(){try{return typeof selectedZone==='function'?selectedZone():'All'}catch(e){return'All'}}
function selectedAsOfSafe(){try{return typeof selectedAsOf==='function'?selectedAsOf():'latest'}catch(e){return'latest'}}
function publicPayload(){return{snapshot:PUBLIC?.snapshot||'',city:PUBLIC?.city||{},zones:PUBLIC?.zones||{},cityDaily:PUBLIC?.cityDaily||[],zoneDaily:PUBLIC?.zoneDaily||{},cashiers:PUBLIC?.cashiers||[],zoneCashiers:PUBLIC?.zoneCashiers||{},crossZone:PUBLIC?.crossZone||[],roster:PUBLIC?.roster||[],workflowCity:PUBLIC?.workflowCity||{},stageByZone:PUBLIC?.stageByZone||{},workflowUnallocated:PUBLIC?.workflowUnallocated||{},paymentMetrics:PUBLIC?.paymentMetrics||null,riRows:PUBLIC?.riRows||[],wardRows:PUBLIC?.wardRows||[],meta:PUBLIC?.meta||{}}}
function enginePayload(){if(!window.OTS7?.loaded)return null;try{return window.__buildSharedPayload?window.__buildSharedPayload(window.OTS7):null}catch(e){console.warn('Could not build local authority payload',e);return null}}
function richRecord(){const L=safeLocal();if(L?._finalRichVersion&&L?.payload)return L;if(privateCache?._finalRichVersion&&privateCache?.payload)return privateCache;return null}
function richPayload(){return richRecord()?.payload||null}
function timeValue(v){const t=Date.parse(S(v));return Number.isFinite(t)?t:0}
function sharedTime(){return timeValue(window.__otsSharedState?.updatedAt||window.__otsLastUpdatedAt||'')}
function richWins(R,S){
 if(!R?.payload)return false;
 if(!S)return true;
 const cmp=isoCmp(R.snapshot,S.snapshot);
 if(cmp>0)return true;
 if(cmp<0)return false;
 return timeValue(R.loadedAt||R.updatedAt||'')>sharedTime();
}
function choosePayload(){
 const E=enginePayload();if(E){localPayload=E;return E}
 const R=richRecord(),S=window.SHARED_LIVE;
 if(R?.payload&&S)return richWins(R,S)?R.payload:S;
 if(S)return S;
 if(R?.payload)return R.payload;
 return publicPayload();
}
function mode(){
 if(window.OTS7?.loaded)return'loaded';
 const R=richRecord(),S=window.SHARED_LIVE;
 if(R?.payload&&S)return richWins(R,S)?'local-pending':(window.__otsSharedState?.source==='cache'?'shared-cache':'shared-live');
 if(S)return window.__otsSharedState?.source==='cache'?'shared-cache':'shared-live';
 if(R?.payload)return'private-cache';
 return'fallback';
}
function control(z){const p=choosePayload();return z==='All'?(p.city||{}):(p.zones?.[z]||{})}
function daily(z){const p=choosePayload();return z==='All'?(p.cityDaily||[]):(p.zoneDaily?.[z]||[])}
function collection(z){const d=daily(z),snap=choosePayload().snapshot||'',sel=selectedAsOfSafe(),asof=sel==='latest'?snap:sel,rows=d.filter(r=>!asof||S(r.date)<=asof),todayRow=rows.find(r=>S(r.date)===asof)||{};return{daily:rows,total:rows.reduce((s,r)=>s+N(r.amount),0),today:N(todayRow.amount),todayReceipts:N(todayRow.receipts),previous:rows.reduce((s,r)=>s+N(r.amount),0)-N(todayRow.amount),receipts:rows.reduce((s,r)=>s+N(r.receipts),0),asof}}
function cashiers(z){const p=choosePayload();if(z==='All')return(p.cashiers||[]).map(r=>({name:r.name||r.cashier||'Unknown',receipts:N(r.receipts),amount:N(r.amount)}));return(p.zoneCashiers?.[z]||[]).map(r=>({name:r.name||r.cashier||'Unknown',receipts:N(r.receipts),amount:N(r.amount)}))}
function detailSource(){if(window.OTS7?.loaded)return window.OTS7;const p=choosePayload(),snap=S(p?.snapshot);const L=safeLocal();if(L?._finalRichVersion&&S(L.snapshot)===snap)return L;if(privateCache?._finalRichVersion&&S(privateCache.snapshot)===snap)return privateCache;return null}
function applications(){const D=detailSource();return D?.apps||D?.applications||[]}
function paidRows(){const D=detailSource();return D?.paidRows||[]}
function payments(){const D=detailSource();return D?.payments||[]}
function fullPaidApps(z='All'){
 const apps=applications(),full=paidRows();if(!apps.length||!full.length)return[];const amap=new Map(apps.map(a=>[appNo(a),a])),seen=new Set(),out=[];
 for(const r of full){const k=appNo(r);if(!k||seen.has(k)||String(r['Payment state']||'').toUpperCase()!=='FULL')continue;const a=amap.get(k);if(!a||!approved(a))continue;const az=zoneOf(a);if(z!=='All'&&az!==z)continue;seen.add(k);out.push({app:k,name:r['Applicant / owner']||a['Applicant / owner']||'',uid:r['Property UID']||a['Property UID']||'',house:r['House / property no.']||a['House / property no.']||'',zone:az||'',paid:N(r['Total paid']),payable:N(r['Total payable'])})}
 return out;
}
function followupRows(z='All'){
 const apps=applications();if(!apps.length)return[];const paid=new Set();for(const r of paidRows())if(appNo(r))paid.add(appNo(r));for(const r of payments())if(appNo(r))paid.add(appNo(r));return apps.filter(a=>approved(a)&&!paid.has(appNo(a))&&(z==='All'||zoneOf(a)===z));
}
function workflowCity(){return choosePayload().workflowCity||{}}
function stageByZone(z){return choosePayload().stageByZone?.[z]||{}}
function workflowUnallocated(){return choosePayload().workflowUnallocated||{}}
function riRows(z='All'){return(choosePayload().riRows||[]).filter(r=>z==='All'||r.zone===z)}
function wardRows(z='All'){return(choosePayload().wardRows||[]).filter(r=>z==='All'||r.zone===z)}
function sourceStatus(){const p=choosePayload(),m=mode(),labels={loaded:'Reports loaded · private detail active','local-pending':'Local recalculation · live publish pending','private-cache':'Private detail restored','shared-live':'Live published snapshot','shared-cache':'Cached live snapshot','fallback':'Fallback snapshot'};return{mode:m,label:labels[m]||m,snapshot:p.snapshot||'',updatedAt:window.__otsLastUpdatedAt||window.__otsSharedState?.updatedAt||null,error:window.__otsSharedState?.error||null}}
window.OTS_AUTHORITY={payload:choosePayload,mode,control,daily,collection,cashiers,applications,paidRows,payments,fullPaidApps,followupRows,workflowCity,stageByZone,workflowUnallocated,riRows,wardRows,sourceStatus,zoneOf};

window.currentControl=function(z){return control(z)};
window.getDaily=function(z){return daily(z)};
window.getCollectionMetrics=function(z){return collection(z)};
window.getCashierRows=function(){return cashiers(selectedZoneSafe())};

function richFromEngine(){
 if(!window.OTS7?.loaded)return null;const E=window.OTS7,p=enginePayload();if(!p)return null;const L=safeLocal()||{};
 return{...L,_finalRichVersion:RICH,snapshot:E.snapshot,fileNames:E.files||L.fileNames||[],loadedAt:new Date().toISOString(),payload:p,controls:{city:p.city,zones:p.zones},cityDaily:p.cityDaily,zoneDaily:p.zoneDaily,cashiers:p.cashiers,zoneCashiers:p.zoneCashiers,crossZone:p.crossZone,workflowCity:p.workflowCity,stageByZone:p.stageByZone,workflowUnallocated:p.workflowUnallocated,paymentMetrics:p.paymentMetrics,riRows:p.riRows,wardRows:p.wardRows,meta:p.meta,applications:E.apps||L.applications||[],apps:E.apps||L.applications||[],payments:L.payments?.length?L.payments:(E.payments||[]),paidRows:E.paidRows||[],approved:E.approved||[],inprocess:E.inprocess||[]};
}
async function saveRich(){
 const r=richFromEngine();if(!r)return null;try{if(typeof window.__applyPropertyContactMaster==='function'){const x=window.__applyPropertyContactMaster();if(x&&typeof x.then==='function')await x}}catch(e){}await new Promise(res=>setTimeout(res,120));
 const current=safeLocal();if(current?.applications?.length){r.applications=current.applications;r.apps=current.applications}privateCache=r;try{LOCAL=r}catch(e){}
 try{if(typeof saveSnapshot==='function')await saveSnapshot(r)}catch(e){console.warn('Rich snapshot save failed',e)}
 localPayload=r.payload;renderStatus();document.dispatchEvent(new CustomEvent('ots:authority-updated',{detail:sourceStatus()}));return r;
}
function openDb(){return new Promise((res,rej)=>{const q=indexedDB.open('AgraOTSNexus',1);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);q.onupgradeneeded=()=>{const d=q.result;if(!d.objectStoreNames.contains('snapshots'))d.createObjectStore('snapshots',{keyPath:'snapshot'})}})}
async function readLatest(){if(restoring)return null;restoring=true;try{const d=await openDb();return await new Promise((res,rej)=>{const tx=d.transaction('snapshots','readonly'),q=tx.objectStore('snapshots').openCursor(null,'prev');q.onsuccess=()=>res(q.result?.value||null);q.onerror=()=>rej(q.error)})}catch(e){console.warn('Private snapshot restore unavailable',e);return null}finally{restoring=false}}
async function restorePrivate(){
 if(window.OTS7?.loaded){renderStatus();return}
 const sharedState=window.__otsSharedState?.source||'loading';
 if(sharedState==='loading'&&!window.SHARED_LIVE){setTimeout(restorePrivate,450);return}
 const r=await readLatest();if(!r)return;privateCache=r;
 if(!r._finalRichVersion||!r.payload){renderStatus();return}
 const SLive=window.SHARED_LIVE;
 if(richWins(r,SLive)){
   try{LOCAL=r}catch(e){}
   localPayload=r.payload||null;
   if(window.rebuildDateSelector)rebuildDateSelector();
   if(window.renderAll)window.renderAll();
   document.dispatchEvent(new CustomEvent('ots:authority-updated',{detail:sourceStatus()}));
 }else{
   const L=safeLocal();
   if(L?._finalRichVersion&&SLive&&isoCmp(L.snapshot,SLive.snapshot)<0){try{LOCAL=null}catch(e){}}
   localPayload=null;
   if(window.renderAll)window.renderAll();
 }
 renderStatus();
}
function renderStatus(){
 const strip=document.getElementById('officialLiveStrip');if(!strip)return;let chip=document.getElementById('authorityStatusChip');if(!chip){chip=document.createElement('span');chip.id='authorityStatusChip';chip.className='authority-status-chip';strip.appendChild(chip)}const s=sourceStatus();chip.dataset.mode=s.mode;chip.textContent=s.label;chip.title=s.error?`Data source warning: ${s.error}`:`Data source: ${s.label}`;
 let warn=document.getElementById('authorityWarning');if(s.mode==='fallback'||s.mode==='local-pending'){if(!warn){warn=document.createElement('div');warn.id='authorityWarning';warn.className='authority-warning';strip.insertAdjacentElement('afterend',warn)}warn.textContent=s.mode==='local-pending'?'Latest reports are calculated in this browser, but the live publish has not been confirmed yet.':'Live snapshot could not be loaded. A fallback snapshot is being shown.'}else warn?.remove();
}
function installStyle(){if(document.getElementById('authorityIntegrityStyle'))return;const s=document.createElement('style');s.id='authorityIntegrityStyle';s.textContent=`.authority-status-chip{margin-left:auto;align-self:center;padding:6px 9px;border-radius:999px;border:1px solid #cfe1ec;background:linear-gradient(135deg,#eef8ff,#f4fbf7);color:#42647d;font-size:8px;font-weight:800;white-space:nowrap}.authority-status-chip[data-mode="loaded"],.authority-status-chip[data-mode="shared-live"],.authority-status-chip[data-mode="private-cache"]{background:linear-gradient(135deg,#eafaf2,#f7fffb);border-color:#cfead9;color:#326c53}.authority-status-chip[data-mode="shared-cache"]{background:#fff8e8;border-color:#f1dfad;color:#856420}.authority-status-chip[data-mode="local-pending"],.authority-status-chip[data-mode="fallback"]{background:#fff3e8;border-color:#efcda9;color:#8a5523}.authority-warning{margin:8px 0 0;padding:9px 12px;border:1px solid #efd0aa;border-radius:12px;background:#fff7ec;color:#76532e;font-size:9px;font-weight:700}@media(max-width:720px){.authority-status-chip{width:100%;text-align:center;margin-left:0}}@media print{.authority-status-chip,.authority-warning{display:none!important}}`;document.head.appendChild(s)}

function wrapProcess(){if(window.__finalIntegrityProcessWrapped)return;const old=window.processReportSet||window.processWorkbook;if(typeof old!=='function')return;window.__finalIntegrityProcessWrapped=true;window.processReportSet=async function(){const out=await old.apply(this,arguments);if(window.OTS7?.loaded){await saveRich();if(window.renderAll)window.renderAll()}return out};window.processWorkbook=window.processReportSet;const submit=document.querySelector('#reportModal .btn.primary');if(submit)submit.onclick=window.processReportSet}
function refresh(){installStyle();wrapProcess();renderStatus()}
let tries=0;const timer=setInterval(()=>{tries++;refresh();if(window.__finalIntegrityProcessWrapped||tries>100)clearInterval(timer)},100);
window.addEventListener('load',()=>{refresh();setTimeout(restorePrivate,500);setTimeout(renderStatus,1200)});
document.addEventListener('ots:shared-applied',()=>{setTimeout(restorePrivate,120);setTimeout(renderStatus,160)});
document.addEventListener('ots:shared-failed',()=>{setTimeout(restorePrivate,120);setTimeout(renderStatus,180)});
})();