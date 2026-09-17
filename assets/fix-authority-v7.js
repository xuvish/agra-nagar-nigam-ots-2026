(function(){
'use strict';
const DB='AgraOTSProductionV7',STORE='details',ZONES=['Chhatta','Hariparwat','Tajganj','Lohamandi'];
let detailCache=null;
const s=v=>String(v??'').trim(),n=v=>Number(v)||0,norm=v=>s(v).toLowerCase();
const appNo=r=>s(r?.['Application number']);
const zoneOf=r=>{const z=s(r?.['Allocated zone']||r?.['Property zone']||r?._r?.zone);return ZONES.includes(z)?z:null};
const approved=a=>norm(a?.['Application status'])==='approved';
function payload(){if(window.OTS7?.loaded&&window.__buildSharedPayload){try{return window.__buildSharedPayload(window.OTS7)}catch(e){}}return window.SHARED_LIVE||PUBLIC}
function openDb(){return new Promise((res,rej)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>{const d=q.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'snapshot'})};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function putDetail(row){const d=await openDb();return new Promise((res,rej)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).put(row);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function getDetail(snapshot){if(!snapshot)return null;const d=await openDb();return new Promise((res,rej)=>{const q=d.transaction(STORE,'readonly').objectStore(STORE).get(snapshot);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})}
function currentDetail(){const snap=s(payload()?.snapshot);return detailCache&&s(detailCache.snapshot)===snap?detailCache:null}
async function restore(snapshot=s(payload()?.snapshot)){try{detailCache=await getDetail(snapshot);document.dispatchEvent(new CustomEvent('ots:detail-ready',{detail:{snapshot,available:!!detailCache}}));return detailCache}catch(e){return null}}
async function save(){
 if(!window.OTS7?.loaded)return null;const E=window.OTS7,snap=s(E.snapshot);if(!snap)return null;
 let apps=E.apps||[];try{if(typeof LOCAL!=='undefined'&&LOCAL?.snapshot===snap&&LOCAL?.applications?.length)apps=LOCAL.applications}catch(e){}
 const row={snapshot:snap,savedAt:new Date().toISOString(),apps,applications:apps,payments:E.payments||[],paidRows:E.paidRows||[],approved:E.approved||[],inprocess:E.inprocess||[]};
 await putDetail(row);detailCache=row;document.dispatchEvent(new CustomEvent('ots:detail-ready',{detail:{snapshot:snap,available:true}}));return row;
}
function applications(){return currentDetail()?.apps||[]}
function payments(){return currentDetail()?.payments||[]}
function paidRows(){return currentDetail()?.paidRows||[]}
function fullPaidApps(z='All'){
 const D=currentDetail(),apps=D?.apps||[],paid=D?.paidRows||[];if(!apps.length)return[];
 const amap=new Map(apps.map(a=>[appNo(a),a])),seen=new Set(),out=[];
 for(const r of paid){const k=appNo(r);if(!k||seen.has(k)||s(r['Payment state']).toUpperCase()!=='FULL')continue;const a=amap.get(k);if(!a||!approved(a))continue;const az=zoneOf(a);if(z!=='All'&&az!==z)continue;seen.add(k);out.push({app:k,name:s(r['Applicant / owner']||a['Applicant / owner']),uid:s(r['Property UID']||a['Property UID']),house:s(r['House / property no.']||a['House / property no.']),zone:az||'',ward:s(a['Allocated ward']||a?._r?.ward),ri:s(a['Allocated RI / TC']||a?._r?.ri),mobile:s(a['Mobile']||a['Mobile No.']||a['Mobile (masked)']),paid:n(r['Total paid']),payable:n(r['Total payable'])})}
 return out;
}
function followupRows(z='All'){
 const apps=applications();if(!apps.length)return[];const paid=new Set();for(const r of paidRows())if(appNo(r))paid.add(appNo(r));for(const r of payments())if(appNo(r))paid.add(appNo(r));
 return apps.filter(a=>approved(a)&&!paid.has(appNo(a))&&(z==='All'||zoneOf(a)===z));
}
function control(z){const p=payload();return z==='All'?(p.city||{}):(p.zones?.[z]||{})}
function daily(z){const p=payload();return z==='All'?(p.cityDaily||[]):(p.zoneDaily?.[z]||[])}
function collection(z){const d=daily(z),snap=s(payload()?.snapshot),rows=d.filter(r=>!snap||s(r.date)<=snap),today=rows.find(r=>s(r.date)===snap)||{};return{daily:rows,total:rows.reduce((a,r)=>a+n(r.amount),0),today:n(today.amount),todayReceipts:n(today.receipts),receipts:rows.reduce((a,r)=>a+n(r.receipts),0),asof:snap}}
function cashiers(z){const p=payload();return z==='All'?(p.cashiers||[]):(p.zoneCashiers?.[z]||[])}
function riRows(z='All'){return(payload()?.riRows||[]).filter(r=>z==='All'||r.zone===z)}
function wardRows(z='All'){return(payload()?.wardRows||[]).filter(r=>z==='All'||r.zone===z)}
window.OTS_AUTHORITY={payload,control,daily,collection,cashiers,applications,payments,paidRows,fullPaidApps,followupRows,riRows,wardRows,detail:currentDetail,loadDetail:getDetail,restoreDetail:restore,zoneOf};
const prev=window.processReportSet||window.processWorkbook;
window.processReportSet=async function(){const out=await prev.apply(this,arguments);if(window.OTS7?.loaded)await save();return out};window.processWorkbook=window.processReportSet;
document.addEventListener('ots:shared-ready',()=>restore());
document.addEventListener('ots:shared-applied',()=>restore());
document.addEventListener('ots:published',()=>save());
if(window.__otsSharedState?.source&&window.__otsSharedState.source!=='loading')restore();
})();