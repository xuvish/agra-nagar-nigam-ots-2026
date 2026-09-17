(function(){
'use strict';
const $=id=>document.getElementById(id);
const n=v=>Number(v)||0;
function fmtNum(v){try{return typeof num==='function'?num(v):n(v).toLocaleString('en-IN')}catch(e){return n(v).toLocaleString('en-IN')}}
function selected(){try{return typeof selectedZone==='function'?selectedZone():'All'}catch(e){return'All'}}
function current(z){try{return typeof currentControl==='function'?currentControl(z):((window.PUBLIC?.zones||{})[z]||{})}catch(e){return{}}}
function approvedSet(){const E=window.OTS7;if(!E?.loaded)return null;return new Set((E.apps||[]).filter(a=>String(a['Application status']||'').trim().toLowerCase()==='approved').map(a=>String(a['Application number']||'').trim()).filter(Boolean))}
function fullPaidCount(z){
 const E=window.OTS7,approved=approvedSet();
 if(E?.loaded&&approved){
   const s=new Set();
   if(z==='All'){
     for(const r of E.paidRows||[]){const app=String(r['Application number']||'').trim();if(app&&approved.has(app)&&String(r['Payment state']||'').toUpperCase()==='FULL')s.add(app)}
   }else{
     for(const p of E.payments||[]){const app=String(p['Application number']||'').trim();if(!app||!approved.has(app)||p['Property zone']!==z)continue;if(String(p['Payment state']||'').toUpperCase()==='FULL')s.add(app)}
   }
   return s.size;
 }
 const c=current(z);if(c.fullPaid!==undefined&&c.fullPaid!==null)return n(c.fullPaid);
 return null;
}
function addMainCard(){
 const box=$('kpis');if(!box)return;
 box.querySelector('.exec-payment-done')?.remove();
 const z=selected(),count=fullPaidCount(z),card=document.createElement('div');
 card.className='kpi exec-kpi exec-payment-done';
 card.innerHTML=`<div class="lab">Approved & Payment Done</div><div class="val">${count===null?'—':fmtNum(count)}</div><div class="sub">${count===null?'Available with FULL payment report':'FULL payment completed'}</div>`;
 const before=[...box.querySelectorAll('.kpi')].find(x=>x.querySelector('.lab')?.textContent.trim()==='Total Collection');
 if(before)box.insertBefore(card,before);else box.appendChild(card);
}
function addZoneStats(){
 document.querySelectorAll('.zone-card').forEach(card=>{
   const zone=card.querySelector('.zone-title b')?.textContent?.trim();if(!zone)return;
   const stats=card.querySelector('.zone-stats');if(!stats)return;
   stats.querySelector('.payment-done-stat')?.remove();
   const count=fullPaidCount(zone),el=document.createElement('div');el.className='zone-stat payment-done-stat';
   el.innerHTML=`<span>Payment Done</span><b>${count===null?'—':fmtNum(count)}</b>`;
   const wide=stats.querySelector('.zone-stat.wide');if(wide)stats.insertBefore(el,wide);else stats.appendChild(el);
   const paid=[...stats.querySelectorAll('.zone-stat')].find(x=>x.querySelector('span')?.textContent.trim()==='Paid Apps');
   if(paid)paid.querySelector('span').textContent='Payment Started';
 })
}
function render(){addMainCard();addZoneStats()}
function hook(){
 if(window.__paymentDoneHooked)return;
 const old=window.renderAll;if(typeof old!=='function')return;
 window.__paymentDoneHooked=true;
 window.renderAll=function(){const r=old.apply(this,arguments);setTimeout(render,25);return r};
}
let t=0;const timer=setInterval(()=>{t++;hook();render();if((window.__paymentDoneHooked&&$('kpis'))||t>100)clearInterval(timer)},120);
window.addEventListener('load',()=>{hook();setTimeout(render,250)});
})();
