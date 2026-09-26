(function(){
'use strict';
const ENDPOINT='https://pdtongvzntgvwnkhkxti.supabase.co/functions/v1/ots-protected-detail';
const token=(location.hash.match(/(?:^#|&)ots-share=([a-f0-9]{64})(?:&|$)/)||[])[1]||'';
const cache=new Map();let scope='',busy=null;
async function call(body){const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw Error(j.error||'Protected detail service unavailable');return j}
function cred(){return window.__otsAdminCred||{}}
async function load(date){
 if(!date)return null;
 if(cache.has(date))return cache.get(date);
 if(busy)return busy;
 const c=cred();if(!token&&!c.password)return null;
 busy=(async()=>{try{const j=token?await call({action:'officer_read',token}):await call({action:'admin_read',snapshot_date:date,...c});if(j.detail?.snapshot){scope=j.zone||'All';cache.set(j.detail.snapshot,j.detail);state();if(token&&j.detail.snapshot!==date){setTimeout(()=>window.__otsOpenDate?.(j.detail.snapshot),0);return null}return j.detail.snapshot===date?j.detail:null}return null}catch(e){console.warn('Protected detail:',e.message);state(e.message);return null}finally{busy=null}})();
 return busy;
}
async function upload(d){const c=cred();if(!c.password)throw Error('Administrator login required');const detail={snapshot:d.snapshot,apps:d.apps||d.applications||[],payments:d.payments||[],paidRows:d.paidRows||[],approved:d.approved||[],inprocess:d.inprocess||[]};const result=await call({action:'upload',snapshot_date:d.snapshot,detail,...c});cache.set(d.snapshot,detail);scope='All';state();return result}
async function share(z){const c=cred(),date=(window.SHARED_LIVE||window.PUBLIC)?.snapshot;if(!c.password){window.otsUnlockDetail?.();return}const btn=document.getElementById('otsShareZone');if(btn){btn.disabled=true;btn.textContent='Creating link…'}try{const j=await call({action:'share',snapshot_date:date,zone:z,...c});const link=new URL(location.pathname,location.origin);link.hash='ots-share='+j.token;const value=link.toString();let copied=false;try{await navigator.clipboard.writeText(value);copied=true}catch(_){}if(!copied){let field=document.getElementById('otsShareLink');if(!field){field=document.createElement('input');field.id='otsShareLink';field.readOnly=true;field.style.cssText='width:min(100%,400px);padding:8px';document.getElementById('prodModalActions')?.appendChild(field)}field.value=value;field.select();try{copied=document.execCommand('copy')}catch(_){}}if(btn)btn.textContent=copied?'Copied · '+z+' · valid 7 days':'Link ready below · tap to copy'}catch(e){if(btn)btn.textContent=e.message||'Could not share'}finally{if(btn)setTimeout(()=>{btn.disabled=false;btn.textContent='Copy protected zone link'},4000)}}
function state(error){let b=document.getElementById('otsUnlockDetails');if(!b){const controls=document.getElementById('prodControlsV8');if(!controls)return;b=document.createElement('button');b.id='otsUnlockDetails';b.type='button';b.className='prod-inline-action';controls.appendChild(b);b.onclick=()=>window.otsUnlockDetail?.()}
 const label=error?'Detail access: '+error:token?(scope?'Protected '+scope+' detail':'Opening protected zone…'):(cred().password?(cache.size?'Applicant details ready':'Load applicant details'):'Unlock details');if(b.textContent!==label)b.textContent=label;
 const title=document.getElementById('prodModalTitle')?.textContent||'',m=title.match(/^(Chhatta|Hariparwat|Tajganj|Lohamandi) Zone$/),actions=document.getElementById('prodModalActions');
 if(m&&actions&&cred().password&&!document.getElementById('otsShareZone')){const s=document.createElement('button');s.id='otsShareZone';s.type='button';s.textContent='Copy protected zone link';s.onclick=()=>share(m[1]);actions.appendChild(s)}
 if(actions&&!m){document.getElementById('otsShareZone')?.remove();document.getElementById('otsShareLink')?.remove()}
}
document.addEventListener('ots:admin-login',async()=>{cache.clear();await load((window.SHARED_LIVE||window.PUBLIC)?.snapshot);state()});
document.addEventListener('ots:published',()=>{cache.clear();state()});
document.addEventListener('ots:bootstrap-ready',()=>{state();if(token)load((window.SHARED_LIVE||window.PUBLIC)?.snapshot)});
document.addEventListener('ots:shared-ready',()=>{state();if(token)load((window.SHARED_LIVE||window.PUBLIC)?.snapshot)});
new MutationObserver(()=>state()).observe(document.body,{childList:true,subtree:true});
window.OTS_PRIVATE={load,upload,share};
state();
})();
