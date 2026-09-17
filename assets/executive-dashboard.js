(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ZS=['Chhatta','Hariparwat','Tajganj','Lohamandi'];
function n(v){return Number(v)||0}
function fmtNum(v){try{return typeof num==='function'?num(v):n(v).toLocaleString('en-IN')}catch(e){return n(v).toLocaleString('en-IN')}}
function fmtMoney(v){try{return typeof money==='function'?money(v):`₹${n(v).toLocaleString('en-IN')}`}catch(e){return `₹${n(v).toLocaleString('en-IN')}`}}
function fmtPct(a,b){try{return typeof pct==='function'?pct(a,b):(b?`${(n(a)*100/n(b)).toFixed(1)}%`:'0%')}catch(e){return b?`${(n(a)*100/n(b)).toFixed(1)}%`:'0%'}}
function getZoneControl(z){try{return currentControl(z)||{}}catch(e){return (window.PUBLIC?.zones||{})[z]||{}}}
function getMetrics(z){try{return getCollectionMetrics(z)||{}}catch(e){const c=getZoneControl(z);return{total:n(c.collection),today:0,receipts:n(c.receipts),asof:window.PUBLIC?.snapshot||''}}}
function stageCounts(){
 const z=(typeof selectedZone==='function'?selectedZone():'All');
 const out={CTO:0,RI:0,TS:0,'With Applicant':0,Other:0};
 try{
   if(window.LOCAL&&typeof localResolved==='function'){
     for(const a of (localResolved().applications||[])){
       if(String(a['Application status']||'').toLowerCase()==='approved')continue;
       if(z!=='All'&&a?._r?.zone!==z)continue;
       const s=typeof stageForPending==='function'?stageForPending(a['Pending with']):'Other';out[s]=(out[s]||0)+1;
     }
     return out;
   }
 }catch(e){}
 if(z==='All'&&window.SHARED_LIVE?.workflowCity)return Object.assign(out,window.SHARED_LIVE.workflowCity);
 if(z!=='All')return Object.assign(out,window.PUBLIC?.stageByZone?.[z]||{});
 for(const row of Object.values(window.PUBLIC?.stageByZone||{}))for(const [k,v] of Object.entries(row||{}))out[k]=(out[k]||0)+n(v);
 return out;
}
function renderPrimaryKPIs(){
 const z=typeof selectedZone==='function'?selectedZone():'All',c=getZoneControl(z),m=getMetrics(z);
 const paymentPending=Math.max(0,n(c.approved)-n(c.payingApps));
 const cards=[
  ['Total Applications',fmtNum(c.applications),z==='All'?'Nagar Nigam total':`${z} zone`,'blue'],
  ['Approved',fmtNum(c.approved),`${fmtPct(c.approved,c.applications)} of applications`,'green'],
  ['In Process',fmtNum(c.inProcess),'Current pending workflow','amber'],
  ['Approved · Payment Pending',fmtNum(paymentPending),'No payment started yet','pink'],
  ['Total Collection',fmtMoney(m.total),`${fmtNum(m.receipts)} receipts`,'mint'],
  ['Today Collection',fmtMoney(m.today),m.asof?(typeof dateLabel==='function'?dateLabel(m.asof):m.asof):'Latest report date','cyan'],
  ['Demand',fmtMoney(c.demand),'OTS demand control','lavender'],
  ['Recovery vs Demand',fmtPct(m.total,c.demand),'Collection against demand','peach']
 ];
 const box=$('kpis');if(!box)return;
 box.innerHTML=cards.map((x,i)=>`<div class="kpi exec-kpi exec-${x[3]}"><div class="lab">${esc(x[0])}</div><div class="val">${esc(x[1])}</div><div class="sub">${esc(x[2])}</div></div>`).join('');
}
function renderExecutive(){
 renderPrimaryKPIs();
 const host=$('executiveOverview');if(!host)return;
 const zSel=typeof selectedZone==='function'?selectedZone():'All';
 const zones=(zSel==='All'?ZS:[zSel]);
 const zoneCards=zones.map(z=>{const c=getZoneControl(z),m=getMetrics(z);let ts='';try{ts=typeof tsFor==='function'?tsFor(z):''}catch(e){}
   return `<div class="zone-card"><div class="zone-title"><b>${esc(z)}</b><small>${esc(ts||'')}</small></div><div class="zone-stats"><div class="zone-stat"><span>Applications</span><b>${fmtNum(c.applications)}</b></div><div class="zone-stat"><span>Approved</span><b>${fmtNum(c.approved)}</b></div><div class="zone-stat"><span>Pending</span><b>${fmtNum(c.inProcess)}</b></div><div class="zone-stat"><span>Paid Apps</span><b>${fmtNum(c.payingApps)}</b></div><div class="zone-stat wide"><span>Collection</span><b>${fmtMoney(m.total)}</b></div></div></div>`}).join('');
 const p=stageCounts();
 const pend=[['With Applicant',p['With Applicant'],'Correction pending'],['CTO',p.CTO,'Zone / Ward / RI marking'],['RI',p.RI,'Application checking'],['TS',p.TS,'Final approval']];
 host.innerHTML=`<section class="executive-section"><div class="executive-head"><h3>${zSel==='All'?'Zone-wise Position':'Selected Zone Position'}</h3><span>Applications · approval · pendency · collection</span></div><div class="zone-glance">${zoneCards}</div></section><section class="executive-section"><div class="executive-head"><h3>Pending Responsibility</h3><span>Where pending applications are currently held</span></div><div class="executive-pendency">${pend.map(x=>`<div class="ep-card"><span>${esc(x[0])}</span><b>${fmtNum(x[1])}</b><small>${esc(x[2])}</small></div>`).join('')}</div></section>`;
}
function prepareLayout(){
 const toolbar=document.querySelector('.toolbar'),search=$('search');
 if(toolbar&&search&&!search.closest('.search-wrap')){
  const wrap=document.createElement('div');wrap.className='search-wrap';search.parentNode.insertBefore(wrap,search);wrap.appendChild(search);
  const btn=document.createElement('button');btn.type='button';btn.className='search-inside';btn.setAttribute('aria-label','Search');btn.title='Search';btn.textContent='⌕';btn.onclick=()=>{search.focus();if(typeof renderAll==='function')renderAll()};wrap.appendChild(btn);
 }
 const command=$('command');
 if(command&&!$('executiveOverview')){const host=document.createElement('div');host.id='executiveOverview';host.className='executive-overview';command.insertBefore(host,command.firstChild)}
 if(command&&!command.querySelector('.detail-drawer')){
   const grids=command.querySelectorAll(':scope > .grid2');
   if(grids[1]){const d=document.createElement('details');d.className='detail-drawer';const s=document.createElement('summary');s.textContent='Detailed Registers';d.appendChild(s);grids[1].parentNode.insertBefore(d,grids[1]);d.appendChild(grids[1])}
 }
 renderExecutive();
}
function hook(){
 if(window.__executiveDashboardHooked)return;
 const old=window.renderAll;
 if(typeof old!=='function')return;
 window.__executiveDashboardHooked=true;
 window.renderAll=function(){const r=old.apply(this,arguments);setTimeout(renderExecutive,0);return r};
}
let tries=0;const timer=setInterval(()=>{tries++;prepareLayout();hook();if((window.__executiveDashboardHooked&&$('executiveOverview'))||tries>80)clearInterval(timer)},100);
window.addEventListener('load',()=>{prepareLayout();hook();renderExecutive()});
let printWasOpen=false;window.addEventListener('beforeprint',()=>{const d=document.querySelector('.detail-drawer');if(d){printWasOpen=d.open;d.open=true}});window.addEventListener('afterprint',()=>{const d=document.querySelector('.detail-drawer');if(d)d.open=printWasOpen});
})();