(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ZS=['Chhatta','Hariparwat','Tajganj','Lohamandi'];
function n(v){return Number(v)||0}
function fmtNum(v){try{return typeof num==='function'?num(v):n(v).toLocaleString('en-IN')}catch(e){return n(v).toLocaleString('en-IN')}}
function fmtMoney(v){try{return typeof money==='function'?money(v):`₹${n(v).toLocaleString('en-IN')}`}catch(e){return `₹${n(v).toLocaleString('en-IN')}`}}
function fmtPct(a,b){try{return typeof pct==='function'?pct(a,b):(b?`${(n(a)*100/n(b)).toFixed(1)}%`:'—')}catch(e){return b?`${(n(a)*100/n(b)).toFixed(1)}%`:'—'}}
function auth(){return window.OTS_AUTHORITY||null}
function getZoneControl(z){try{return auth()?.control(z)||currentControl(z)||{}}catch(e){return z==='All'?(window.PUBLIC?.city||{}):(window.PUBLIC?.zones?.[z]||{})}}
function getMetrics(z){try{return auth()?.collection(z)||getCollectionMetrics(z)||{}}catch(e){const c=getZoneControl(z);return{total:n(c.collection),today:0,todayReceipts:0,receipts:n(c.receipts),asof:window.PUBLIC?.snapshot||''}}}
function selected(){try{return typeof selectedZone==='function'?selectedZone():'All'}catch(e){return'All'}}
function stageCounts(){const z=selected(),out={CTO:0,RI:0,TS:0,'With Applicant':0,Other:0};const A=auth();if(A){const src=z==='All'?A.workflowCity():A.stageByZone(z);return Object.assign(out,src||{})}if(z==='All'&&window.SHARED_LIVE?.workflowCity)return Object.assign(out,window.SHARED_LIVE.workflowCity);return Object.assign(out,window.PUBLIC?.stageByZone?.[z]||{})}
function paymentStarted(c){return n(c.paymentStartedApproved??c.payingApps)}
function paymentDone(c){return c.fullPaidApproved==null?null:n(c.fullPaidApproved)}
function paymentPending(c){return c.paymentPendingApproved==null?Math.max(0,n(c.approved)-paymentStarted(c)):n(c.paymentPendingApproved)}
function renderPrimaryKPIs(){
 const z=selected(),c=getZoneControl(z),m=getMetrics(z),done=paymentDone(c);
 const cards=[
  ['Total Applications',fmtNum(c.applications),z==='All'?'Nagar Nigam total':`${z} zone`,'blue'],
  ['Approved',fmtNum(c.approved),`${fmtPct(c.approved,c.applications)} of applications`,'green'],
  ['In Process',fmtNum(c.inProcess),'Current pending workflow','amber'],
  ['Approved & Payment Done',done==null?'—':fmtNum(done),done==null?'Available after FULL-payment reconciliation':'FULL payment completed','payment-done'],
  ['Approved · Payment Pending',fmtNum(paymentPending(c)),'Approved · no payment started','pink'],
  ['Total Collection',fmtMoney(m.total),`${fmtNum(m.receipts)} receipts`,'mint'],
  ['Today Collection',fmtMoney(m.today),`${fmtNum(m.todayReceipts||0)} receipts · ${m.asof?(typeof dateLabel==='function'?dateLabel(m.asof):m.asof):'latest date'}`,'cyan'],
  ['Demand',fmtMoney(c.demand),'OTS demand control','lavender'],
  ['Recovery vs Demand',fmtPct(m.total,c.demand),'Collection against demand','peach']
 ];
 const box=$('kpis');if(!box)return;box.innerHTML=cards.map(x=>`<div class="kpi exec-kpi exec-${x[3]}"><div class="lab">${esc(x[0])}</div><div class="val">${esc(x[1])}</div><div class="sub">${esc(x[2])}</div></div>`).join('');
}
function renderExecutive(){
 renderPrimaryKPIs();const host=$('executiveOverview');if(!host)return;const zSel=selected(),zones=zSel==='All'?ZS:[zSel];
 const zoneCards=zones.map(z=>{const c=getZoneControl(z),m=getMetrics(z),done=paymentDone(c);let officer='';try{officer=typeof tsFor==='function'?tsFor(z):''}catch(e){}return`<div class="zone-card"><div class="zone-title"><b>${esc(z)}</b><small>${esc(officer||'')}</small></div><div class="zone-stats"><div class="zone-stat"><span>Applications</span><b>${fmtNum(c.applications)}</b></div><div class="zone-stat"><span>Approved</span><b>${fmtNum(c.approved)}</b></div><div class="zone-stat"><span>In Process</span><b>${fmtNum(c.inProcess)}</b></div><div class="zone-stat"><span>Payment Started</span><b>${fmtNum(paymentStarted(c))}</b></div><div class="zone-stat"><span>Payment Done</span><b>${done==null?'—':fmtNum(done)}</b></div><div class="zone-stat wide"><span>Collection</span><b>${fmtMoney(m.total)}</b></div></div></div>`}).join('');
 const p=stageCounts(),pend=[['With Applicant',p['With Applicant'],'Correction pending'],['CTO',p.CTO,'Zone / Ward / RI marking'],['RI',p.RI,'Application checking'],['TS',p.TS,'Final approval']];if(n(p.Other)>0)pend.push(['Other',p.Other,'Other / source-unallocated stage']);
 host.innerHTML=`<section class="executive-section"><div class="executive-head"><h3>${zSel==='All'?'Zone-wise Position':'Selected Zone Position'}</h3><span>Applications · approval · payment · collection</span></div><div class="zone-glance">${zoneCards}</div></section><section class="executive-section"><div class="executive-head"><h3>Pending Responsibility</h3><span>Where pending applications are currently held</span></div><div class="executive-pendency">${pend.map(x=>`<div class="ep-card"><span>${esc(x[0])}</span><b>${fmtNum(x[1])}</b><small>${esc(x[2])}</small></div>`).join('')}</div></section>`;
}
function prepareLayout(){
 const toolbar=document.querySelector('.toolbar'),search=$('search');if(toolbar&&search&&!search.closest('.search-wrap')){const wrap=document.createElement('div');wrap.className='search-wrap';search.parentNode.insertBefore(wrap,search);wrap.appendChild(search);const btn=document.createElement('button');btn.type='button';btn.className='search-inside';btn.setAttribute('aria-label','Search');btn.title='Search';btn.textContent='⌕';btn.onclick=()=>search.focus();wrap.appendChild(btn)}
 const command=$('command');if(command&&!$('executiveOverview')){const host=document.createElement('div');host.id='executiveOverview';host.className='executive-overview';command.insertBefore(host,command.firstChild)}
 if(command&&!command.querySelector('.detail-drawer')){const grids=command.querySelectorAll(':scope > .grid2');if(grids[1]){const d=document.createElement('details');d.className='detail-drawer';const s=document.createElement('summary');s.textContent='Detailed Registers';d.appendChild(s);grids[1].parentNode.insertBefore(d,grids[1]);d.appendChild(grids[1])}}
 renderExecutive();
}
function hook(){if(window.__executiveDashboardHooked)return;const old=window.renderAll;if(typeof old!=='function')return;window.__executiveDashboardHooked=true;window.renderAll=function(){const r=old.apply(this,arguments);setTimeout(renderExecutive,15);return r}}
let tries=0;const timer=setInterval(()=>{tries++;prepareLayout();hook();if((window.__executiveDashboardHooked&&$('executiveOverview'))||tries>100)clearInterval(timer)},100);
window.addEventListener('load',()=>{prepareLayout();hook();renderExecutive()});document.addEventListener('ots:authority-updated',()=>setTimeout(renderExecutive,25));document.addEventListener('ots:shared-applied',()=>setTimeout(renderExecutive,25));
let printWasOpen=false;window.addEventListener('beforeprint',()=>{const d=document.querySelector('.detail-drawer');if(d){printWasOpen=d.open;d.open=true}});window.addEventListener('afterprint',()=>{const d=document.querySelector('.detail-drawer');if(d)d.open=printWasOpen});
})();