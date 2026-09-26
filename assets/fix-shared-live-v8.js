(function(){
'use strict';
const LIVE_URL='https://pdtongvzntgvwnkhkxti.supabase.co/functions/v1/ots-live';
const PUBLISH_URL='https://pdtongvzntgvwnkhkxti.supabase.co/functions/v1/publish-ots-snapshot';
const ZONES=['Chhatta','Hariparwat','Tajganj','Lohamandi'];
const CACHE_KEY='ots_prod_v8_snapshot_cache';
window.SHARED_LIVE=null;
window.__otsSharedState={source:'loading',updatedAt:null,error:null,isFinal:false};
const S=v=>String(v??'').trim(), N=v=>Number(v)||0, L=v=>S(v).toLowerCase();
const appNo=r=>S(r?.['Application number']);
const approved=a=>L(a?.['Application status'])==='approved';
const rejected=a=>/reject|cancel/.test(L(a?.['Application status']));
const zoneOf=a=>{const z=S(a?.['Allocated zone']||a?._r?.zone);return ZONES.includes(z)?z:null};
const blank=()=>({CTO:0,RI:0,TS:0,IT:0,'With Applicant':0,Other:0});
function stage(v){const x=L(v);if(x.includes('it officer')||x.includes('gaurav sinha'))return'IT';if(x.includes('applicant')||x.startsWith('respected'))return'With Applicant';if(x.includes('cto'))return'CTO';if(/\bri\b/.test(x)||x.includes('(ri)'))return'RI';if(/\bts\b/.test(x)||x.includes('(ts)'))return'TS';return'Other'}
function round(v){return Math.round(N(v)*100)/100}
function paymentMetrics(E){
 const apps=E.apps||[],approvedSet=new Set(apps.filter(approved).map(appNo).filter(Boolean)),zmap=new Map();
 for(const a of apps){const k=appNo(a),z=zoneOf(a);if(k&&z)zmap.set(k,z)}
 for(const p of E.payments||[]){const k=appNo(p),z=S(p['Property zone']);if(k&&ZONES.includes(z)&&!zmap.has(k))zmap.set(k,z)}
 const started=new Set(),full=new Set(),part=new Set();
 for(const r of E.paidRows||[]){const k=appNo(r);if(!k||!approvedSet.has(k))continue;started.add(k);const st=S(r['Payment state']).toUpperCase();if(st==='FULL')full.add(k);else if(st==='PART')part.add(k)}
 for(const r of E.payments||[]){const k=appNo(r);if(k&&approvedSet.has(k))started.add(k)}
 for(const k of full)part.delete(k);
 const zs=Object.fromEntries(ZONES.map(z=>[z,{started:new Set(),full:new Set(),part:new Set()}]));
 for(const k of started){const z=zmap.get(k);if(z)zs[z].started.add(k)}
 for(const k of full){const z=zmap.get(k);if(z)zs[z].full.add(k)}
 for(const k of part){const z=zmap.get(k);if(z)zs[z].part.add(k)}
 const zones={};for(const z of ZONES){const a=N(E.controls?.zones?.[z]?.approved),x=zs[z];zones[z]={approved:a,paymentStartedApproved:x.started.size,fullPaidApproved:x.full.size,partPaidApproved:x.part.size,paymentPendingApproved:Math.max(0,a-x.started.size)}}
 const a=N(E.controls?.city?.approved)||approvedSet.size;
 return{city:{approved:a,paymentStartedApproved:started.size,fullPaidApproved:full.size,partPaidApproved:part.size,paymentPendingApproved:Math.max(0,a-started.size)},zones};
}
function workflow(E){
 const city=blank(),byZone=Object.fromEntries(ZONES.map(z=>[z,blank()])),unallocated=blank();
 for(const r of E.inprocess||[]){const st=stage(r['Pending with']);city[st]++}
 for(const a of E.apps||[]){if(approved(a)||rejected(a))continue;const st=stage(a['Pending with']),z=zoneOf(a);if(z)byZone[z][st]++;else unallocated[st]++}
 return{city,byZone,unallocated};
}
function bump(m,k,a){if(!k)return;m[k]??={receipts:0,amount:0};m[k].receipts++;m[k].amount+=N(a)}
function aggregate(E){
 const cityDaily={},zoneDaily=Object.fromEntries(ZONES.map(z=>[z,{}])),cash={},zoneCash=Object.fromEntries(ZONES.map(z=>[z,{}]));
 const onlineCity={receipts:0,amount:0,applicants:0},onlineByZone=Object.fromEntries(ZONES.map(z=>[z,{receipts:0,amount:0,applicants:0}])),oa=new Set(),oz=Object.fromEntries(ZONES.map(z=>[z,new Set()]));
 for(const p of E.payments||[]){const d=S(p['Payment date']),a=N(p['Amount (INR)']),z=S(p['Property zone']),c=S(p['Cashier / channel'])||'Unknown';bump(cityDaily,d,a);if(zoneDaily[z])bump(zoneDaily[z],d,a);bump(cash,c,a);if(zoneCash[z])bump(zoneCash[z],c,a);if(L(c)==='online'){onlineCity.receipts++;onlineCity.amount+=a;const k=appNo(p);if(k)oa.add(k);if(onlineByZone[z]){onlineByZone[z].receipts++;onlineByZone[z].amount+=a;if(k)oz[z].add(k)}}}
 onlineCity.amount=round(onlineCity.amount);onlineCity.applicants=oa.size;for(const z of ZONES){onlineByZone[z].amount=round(onlineByZone[z].amount);onlineByZone[z].applicants=oz[z].size}
 const toDaily=m=>Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,x])=>({date,receipts:x.receipts,amount:round(x.amount)}));
 const toCash=m=>Object.entries(m).map(([name,x])=>({name,receipts:x.receipts,amount:round(x.amount)})).sort((a,b)=>b.amount-a.amount);
 const zc={};for(const z of ZONES)zc[z]=Object.entries(zoneCash[z]).map(([cashier,x])=>({cashier,receipts:x.receipts,amount:round(x.amount)})).sort((a,b)=>b.amount-a.amount);
 const pm=paymentMetrics(E),wf=workflow(E),city={...(E.controls?.city||{}),...pm.city},zones={};for(const z of ZONES)zones[z]={...(E.controls?.zones?.[z]||{}),...pm.zones[z]};
 return{snapshot:S(E.snapshot),city,zones,cityDaily:toDaily(cityDaily),zoneDaily:Object.fromEntries(ZONES.map(z=>[z,toDaily(zoneDaily[z])])),cashiers:toCash(cash),zoneCashiers:zc,paymentMetrics:pm,workflowCity:wf.city,stageByZone:wf.byZone,workflowUnallocated:wf.unallocated,onlineCity,onlineByZone,riRows:E.riRows||[],wardRows:E.wardRows||[],meta:{sourceFiles:E.files||[],engine:'production-v8',collectionAudit:E.collectionAuthorityAudit||null,sourceAuthority:E.sourceAuthorityAudit||null,classifierAudit:E.classifierAudit||null}};
}
function cache(payload,updatedAt,source,isFinal){try{localStorage.setItem(CACHE_KEY,JSON.stringify({payload,updatedAt,isFinal:!!isFinal,source}))}catch(e){}}
function apply(payload,updatedAt,source='live',isFinal=false){if(!payload)return;window.SHARED_LIVE=payload;window.__otsLastUpdatedAt=updatedAt||null;window.__otsSharedState={source,updatedAt:updatedAt||null,error:null,isFinal:!!isFinal};cache(payload,updatedAt,source,isFinal);for(const k of ['snapshot','city','zones','cityDaily','zoneDaily','cashiers','zoneCashiers','paymentMetrics','workflowCity','stageByZone','workflowUnallocated','onlineCity','onlineByZone','riRows','wardRows','meta'])if(payload[k]!=null)PUBLIC[k]=payload[k];document.dispatchEvent(new CustomEvent('ots:shared-applied',{detail:window.__otsSharedState}));document.dispatchEvent(new CustomEvent('ots:shared-ready',{detail:window.__otsSharedState}))}
async function load(){
 try{const r=await fetch(LIVE_URL,{cache:'no-store'});if(!r.ok)throw Error('Live snapshot request failed');const j=await r.json(),row=j?.snapshot;if(row?.payload){apply(row.payload,row.updated_at,'live',false);return}}catch(e){window.__otsSharedState.error=String(e?.message||e)}
 try{const c=JSON.parse(localStorage.getItem(CACHE_KEY)||'null'),b=window.OTS_BUNDLED_SNAPSHOT,bt=window.OTS_BUNDLED_UPDATED_AT||'';if(c?.payload?.snapshot&&(!b||String(c.updatedAt||'')>=bt)){apply(c.payload,c.updatedAt||null,'cache',!!c.isFinal);return}if(b?.snapshot){apply(b,bt,'bundled',true);return}if(c?.payload?.snapshot){apply(c.payload,c.updatedAt||null,'cache',!!c.isFinal);return}}catch(e){if(window.OTS_BUNDLED_SNAPSHOT){apply(window.OTS_BUNDLED_SNAPSHOT,window.OTS_BUNDLED_UPDATED_AT,'bundled',true);return}}
 window.SHARED_LIVE=null;window.__otsSharedState={source:'empty',updatedAt:null,error:window.__otsSharedState.error||null,isFinal:false};document.dispatchEvent(new CustomEvent('ots:shared-ready',{detail:window.__otsSharedState}))
}
async function publish(payload){const cred=window.__otsAdminCred;if(!cred?.username||!cred?.password)throw Error('Administrator login is required before publishing.');const r=await fetch(PUBLISH_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:cred.username,password:cred.password,snapshot_date:payload.snapshot,payload,source_files:payload.meta?.sourceFiles||[]})});const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok){const e=j?.error;let msg='Live publish failed';if(typeof e==='string'&&e)msg=e;else if(e&&typeof e==='object')msg=String(e.message||e.details||e.hint||JSON.stringify(e));throw Error(msg)}return j}
window.__buildSharedPayload=aggregate;window.__applySharedPayload=apply;window.__publishSharedPayload=publish;window.__reloadSharedLive=load;window.__OTS_PROD_CACHE_KEY=CACHE_KEY;load();
})();