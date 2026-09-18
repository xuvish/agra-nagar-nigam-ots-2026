(function(){
'use strict';
const DB='AgraOTSProductionV8',STORE='details';
let cache=null;
const S=v=>String(v??'').trim(), A=r=>S(r?.['Application number']);
function openDb(){return new Promise((res,rej)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>{const d=q.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'snapshot'})};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function put(row){const d=await openDb();return new Promise((res,rej)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).put(row);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function get(snapshot){if(!snapshot)return null;const d=await openDb();return new Promise((res,rej)=>{const q=d.transaction(STORE,'readonly').objectStore(STORE).get(snapshot);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})}
function payload(){return window.SHARED_LIVE||PUBLIC}
async function save(E=window.OTS7){
 if(!E?.loaded||!E.snapshot)return null;
 let apps=E.apps||[];try{if(typeof LOCAL!=='undefined'&&LOCAL?.snapshot===E.snapshot&&Array.isArray(LOCAL.applications)&&LOCAL.applications.length)apps=LOCAL.applications}catch(e){}
 const row={snapshot:S(E.snapshot),savedAt:new Date().toISOString(),apps,applications:apps,payments:E.payments||[],paidRows:E.paidRows||[],approved:E.approved||[],inprocess:E.inprocess||[]};
 await put(row);cache=row;document.dispatchEvent(new CustomEvent('ots:detail-ready',{detail:{snapshot:row.snapshot,available:true}}));return row
}
async function restore(snapshot=S(payload()?.snapshot)){try{cache=await get(snapshot);document.dispatchEvent(new CustomEvent('ots:detail-ready',{detail:{snapshot,available:!!cache}}));return cache}catch(e){return null}}
function detail(){const snap=S(payload()?.snapshot);return cache&&cache.snapshot===snap?cache:null}
window.OTS_AUTHORITY={payload,detail,saveDetail:save,restoreDetail:restore,loadDetail:get};
document.addEventListener('ots:shared-ready',()=>restore());
document.addEventListener('ots:shared-applied',()=>restore());
})();