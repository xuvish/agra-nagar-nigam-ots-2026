(function(){
'use strict';
const ENDPOINT='https://pdtongvzntgvwnkhkxti.supabase.co/functions/v1/ots-live';
const UKEY='ots_publish_user_v1', PKEY='ots_publish_pass_v1';
function pickPublicSnapshot(){
  const src=window.LOCAL||window.PUBLIC||{};
  const out={};
  for(const k of ['snapshot','city','zones','cityDaily','zoneDaily','cashiers','zoneCashiers','crossZone','roster','wardPerf','riPerf','workflow','joint','unresolved','unresolvedWardRows','meta']){
    if(src[k]!==undefined) out[k]=src[k];
  }
  if(!out.snapshot && window.OTS7?.snapshot) out.snapshot=window.OTS7.snapshot;
  if(!out.city && window.OTS7?.controls?.city) out.city=window.OTS7.controls.city;
  if(!out.zones && window.OTS7?.controls?.zones) out.zones=window.OTS7.controls.zones;
  if(!out.wardPerf && Array.isArray(window.OTS7?.wardRows)) out.wardPerf=window.OTS7.wardRows;
  if(!out.riPerf && Array.isArray(window.OTS7?.riRows)) out.riPerf=window.OTS7.riRows;
  return out;
}
async function loadLatest(){
  try{
    const r=await fetch(ENDPOINT,{cache:'no-store'}); const j=await r.json();
    if(j?.ok&&j.snapshot?.payload){
      window.LOCAL=j.snapshot.payload;
      window.LOCAL.snapshot=j.snapshot.snapshot_date||window.LOCAL.snapshot;
      window.__OTS_SHARED_LIVE__=true;
      const label=document.getElementById('modeLabel'); if(label) label.textContent=`LIVE SHARED DATA · THROUGH ${String(window.LOCAL.snapshot||'').toUpperCase()}`;
      if(typeof window.renderAll==='function') window.renderAll();
    }
  }catch(e){console.warn('Live snapshot unavailable',e)}
}
async function publishLatest(){
  const username=sessionStorage.getItem(UKEY)||'';
  const password=sessionStorage.getItem(PKEY)||'';
  if(!username||!password) return {ok:false,error:'Admin session credentials unavailable. Log in to Manage Reports again.'};
  const payload=pickPublicSnapshot();
  if(!payload?.snapshot) return {ok:false,error:'No calculated report snapshot found.'};
  const files=[...(document.getElementById('masterFile')?.files||[])].map(f=>f.name);
  const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password,snapshot_date:payload.snapshot,payload,source_files:files,controls:payload.city||null})});
  const j=await r.json().catch(()=>({ok:false,error:'Publish response unreadable'}));
  if(!r.ok||!j.ok) throw new Error(j.error||`Publish failed (${r.status})`);
  window.__OTS_SHARED_LIVE__=true;
  return j;
}
// Capture credentials before the existing login handler clears the password field.
document.addEventListener('submit',e=>{
  if(e.target?.id==='adminLoginForm'){
    const u=document.getElementById('adminUser')?.value||'';
    const p=document.getElementById('adminPass')?.value||'';
    if(u&&p){sessionStorage.setItem(UKEY,u.trim());sessionStorage.setItem(PKEY,p)}
  }
},true);
const old=window.processReportSet||window.processWorkbook;
if(typeof old==='function'){
  const wrapped=async function(){
    const result=await old.apply(this,arguments);
    if(window.OTS7?.loaded||window.LOCAL){
      try{
        const pub=await publishLatest();
        const msg=document.getElementById('uploadMsg');
        if(msg){msg.className='msg show ok';msg.textContent=`Reports recalculated and LIVE for all viewers · through ${pub.snapshot_date||window.OTS7?.snapshot||window.LOCAL?.snapshot||''}`;}
      }catch(err){
        const msg=document.getElementById('uploadMsg');
        if(msg){msg.className='msg show err';msg.textContent=`Calculated on this device, but shared publish failed: ${err.message}`;}
      }
    }
    return result;
  };
  window.processReportSet=wrapped;window.processWorkbook=wrapped;
  const btn=document.querySelector('#reportModal .btn.primary');if(btn)btn.onclick=wrapped;
}
window.publishOTSLive=publishLatest;
loadLatest();
})();