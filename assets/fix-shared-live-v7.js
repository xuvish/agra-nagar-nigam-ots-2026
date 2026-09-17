(function(){
'use strict';
const LIVE_URL='https://pdtongvzntgvwnkhkxti.supabase.co/functions/v1/ots-live';
const PUBLISH_URL='https://pdtongvzntgvwnkhkxti.supabase.co/functions/v1/publish-ots-snapshot';
const ZONES=['Chhatta','Hariparwat','Tajganj','Lohamandi'];
window.SHARED_LIVE=null;
window.__otsAdminCred=null;
window.__otsSharedState={source:'loading',updatedAt:null,error:null,isFinal:false};

const s=v=>String(v??'').trim();
const n=v=>s(v).toLowerCase();
const num=v=>Number(v)||0;
const round2=v=>Math.round(num(v)*100)/100;
const appNo=r=>s(r?.['Application number']);
const appZone=a=>{const z=s(a?.['Allocated zone']||a?._r?.zone);return ZONES.includes(z)?z:null};
const approved=a=>n(a?.['Application status'])==='approved';
const rejected=a=>/reject|cancel/.test(n(a?.['Application status']));
function stage(v){const x=n(v);if(x.includes('applicant')||x.startsWith('respected'))return'With Applicant';if(x.includes('cto'))return'CTO';if(/\bri\b/.test(x)||x.includes('(ri)'))return'RI';if(/\bts\b/.test(x)||x.includes('(ts)'))return'TS';return'Other'}
function blankStage(){return{CTO:0,RI:0,TS:0,'With Applicant':0,Other:0}}
function zoneNorm(v){const x=n(v).replace(/[^a-z]/g,'');if(/chh?atta|chatta|chhata/.test(x))return'Chhatta';if(x.includes('haripar'))return'Hariparwat';if(x.includes('tajganj'))return'Tajganj';if(x.includes('lohamandi')||x.includes('lohamand'))return'Lohamandi';return''}

function paymentMetrics(E){
 const apps=E.apps||[],approvedSet=new Set(apps.filter(approved).map(appNo).filter(Boolean)),appZoneMap=new Map();
 for(const a of apps){const k=appNo(a),z=appZone(a);if(k&&z)appZoneMap.set(k,z)}
 for(const p of E.payments||[]){const k=appNo(p),z=s(p['Property zone']);if(k&&ZONES.includes(z)&&!appZoneMap.has(k))appZoneMap.set(k,z)}
 const started=new Set(),full=new Set(),part=new Set();
 for(const r of E.paidRows||[]){const k=appNo(r);if(!k||!approvedSet.has(k))continue;started.add(k);const st=s(r['Payment state']).toUpperCase();if(st==='FULL')full.add(k);else if(st==='PART')part.add(k)}
 for(const r of E.payments||[]){const k=appNo(r);if(k&&approvedSet.has(k))started.add(k)}
 for(const k of full)part.delete(k);
 const zsets=Object.fromEntries(ZONES.map(z=>[z,{started:new Set(),full:new Set(),part:new Set()}]));
 for(const k of started){const z=appZoneMap.get(k);if(z)zsets[z].started.add(k)}
 for(const k of full){const z=appZoneMap.get(k);if(z)zsets[z].full.add(k)}
 for(const k of part){const z=appZoneMap.get(k);if(z)zsets[z].part.add(k)}
 const zones={};
 for(const z of ZONES){const ap=num(E.controls?.zones?.[z]?.approved),x=zsets[z];zones[z]={approved:ap,paymentStartedApproved:x.started.size,fullPaidApproved:x.full.size,partPaidApproved:x.part.size,paymentPendingApproved:Math.max(0,ap-x.started.size)}}
 const ap=num(E.controls?.city?.approved)||approvedSet.size;
 return{city:{approved:ap,paymentStartedApproved:started.size,fullPaidApproved:full.size,partPaidApproved:part.size,paymentPendingApproved:Math.max(0,ap-started.size)},zones};
}
function workflow(E){
 const city=blankStage(),byZone=Object.fromEntries(ZONES.map(z=>[z,blankStage()])),unallocated=blankStage();
 for(const a of E.inprocess||[]){const st=stage(a['Pending with']);city[st]++}
 for(const a of E.apps||[]){if(approved(a)||rejected(a))continue;const st=stage(a['Pending with']),z=appZone(a);if(z)byZone[z][st]++;else unallocated[st]++}
 return{city,byZone,unallocated};
}
function aggregate(E){
 const cityDaily={},zoneDaily=Object.fromEntries(ZONES.map(z=>[z,{}])),cash={},zoneCash=Object.fromEntries(ZONES.map(z=>[z,{}])),cross={};
 const bump=(m,k,a)=>{if(!k)return;m[k]??={receipts:0,amount:0};m[k].receipts++;m[k].amount+=num(a)};
 for(const p of E.payments||[]){
  const d=s(p['Payment date']),a=num(p['Amount (INR)']),z=s(p['Property zone']),c=s(p['Cashier / channel'])||'Unknown';
  bump(cityDaily,d,a);if(zoneDaily[z])bump(zoneDaily[z],d,a);bump(cash,c,a);if(zoneCash[z])bump(zoneCash[z],c,a);
  const src=zoneNorm(p['Receipt zone (source)']);if(src&&z&&src!==z){const k=[src,z,c].join('|');cross[k]??={sourceZone:src,propertyZone:z,cashier:c,receipts:0,amount:0};cross[k].receipts++;cross[k].amount+=a}
 }
 const toDaily=m=>Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,x])=>({date,receipts:x.receipts,amount:round2(x.amount)}));
 const toCash=m=>Object.entries(m).map(([name,x])=>({name,receipts:x.receipts,amount:round2(x.amount)})).sort((a,b)=>b.amount-a.amount);
 const pm=paymentMetrics(E),wf=workflow(E);
 const city={...(E.controls?.city||{}),...pm.city};
 const zones={};for(const z of ZONES)zones[z]={...(E.controls?.zones?.[z]||{}),...pm.zones[z]};
 const zc={};for(const z of ZONES)zc[z]=Object.entries(zoneCash[z]).map(([cashier,x])=>({cashier,receipts:x.receipts,amount:round2(x.amount)})).sort((a,b)=>b.amount-a.amount);
 return{
  snapshot:s(E.snapshot),city,zones,
  cityDaily:toDaily(cityDaily),zoneDaily:Object.fromEntries(ZONES.map(z=>[z,toDaily(zoneDaily[z])])),
  cashiers:toCash(cash),zoneCashiers:zc,crossZone:Object.values(cross).map(x=>({...x,amount:round2(x.amount)})),
  workflowCity:wf.city,stageByZone:wf.byZone,workflowUnallocated:wf.unallocated,paymentMetrics:pm,
  riRows:E.riRows||[],wardRows:E.wardRows||[],
  joint:{applications:0,approved:0,inProcess:0,rejected:0,summaryReceived:0,demand:0,payingApps:0,receipts:0,collection:0},
  unresolved:{applications:0,approved:0,inProcess:0,rejected:0,summaryReceived:0,demand:0,payingApps:0,receipts:0,collection:0},
  meta:{sourceFiles:E.files||[],engine:'production-v7',collectionAudit:E.collectionAuthorityAudit||null,sourceAuthority:E.sourceAuthorityAudit||null}
 };
}
function applyShared(p,updatedAt,source='live',isFinal=false){
 if(!p)return;
 window.SHARED_LIVE=p;window.__otsLastUpdatedAt=updatedAt||null;
 window.__otsSharedState={source,updatedAt:updatedAt||null,error:null,isFinal:!!isFinal};
 for(const k of ['snapshot','city','zones','cityDaily','zoneDaily','cashiers','zoneCashiers','crossZone','stageByZone','workflowCity','workflowUnallocated','paymentMetrics','riRows','wardRows','joint','unresolved','meta'])if(p[k]!=null)PUBLIC[k]=p[k];
 document.dispatchEvent(new CustomEvent('ots:shared-applied',{detail:window.__otsSharedState}));
 document.dispatchEvent(new CustomEvent('ots:shared-ready',{detail:window.__otsSharedState}));
}
async function loadShared(){
 try{
  const r=await fetch(LIVE_URL,{cache:'no-store'});if(!r.ok)throw Error('Live snapshot request failed');
  const j=await r.json(),row=j?.snapshot;
  if(row?.payload){applyShared(row.payload,row.updated_at,'live',false);return}
  window.SHARED_LIVE=null;window.__otsSharedState={source:'empty',updatedAt:null,error:null,isFinal:false};
  document.dispatchEvent(new CustomEvent('ots:shared-ready',{detail:window.__otsSharedState}));
 }catch(e){
  window.SHARED_LIVE=null;window.__otsSharedState={source:'error',updatedAt:null,error:String(e?.message||e),isFinal:false};
  document.dispatchEvent(new CustomEvent('ots:shared-ready',{detail:window.__otsSharedState}));
 }
}
async function publish(payload){
 let cred=window.__otsAdminCred;
 if(!cred?.password){const password=prompt('Enter admin password to publish this report update:');if(!password)throw Error('Live publish cancelled');cred={username:'9997096978',password};window.__otsAdminCred=cred}
 const r=await fetch(PUBLISH_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:cred.username,password:cred.password,snapshot_date:payload.snapshot,payload,source_files:payload.meta?.sourceFiles||[]})});
 const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw Error(j.error||'Live publish failed');return j;
}
window.__buildSharedPayload=aggregate;window.__reloadSharedLive=loadShared;
const prev=window.processReportSet||window.processWorkbook;
window.processReportSet=async function(){
 const out=await prev.apply(this,arguments);
 if(window.OTS7?.loaded){
  const payload=aggregate(window.OTS7);
  try{
   const pub=await publish(payload);applyShared(payload,pub.updated_at||new Date().toISOString(),'live',!!pub.is_final);
   document.dispatchEvent(new CustomEvent('ots:published',{detail:{payload,publish:pub}}));
   if(window.uploadMessage)uploadMessage('Reports calculated, reconciled and published successfully.',true);
  }catch(e){
   window.SHARED_LIVE=payload;window.__otsSharedState={source:'local-pending',updatedAt:new Date().toISOString(),error:String(e.message||e),isFinal:false};
   document.dispatchEvent(new CustomEvent('ots:shared-applied',{detail:window.__otsSharedState}));
   if(window.uploadMessage)uploadMessage('Reports calculated locally, but live publish failed: '+String(e.message||e),false);
  }
 }
 return out;
};
window.processWorkbook=window.processReportSet;
loadShared();
})();