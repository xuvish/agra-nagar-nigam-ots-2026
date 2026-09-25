(function(){
'use strict';
const LIVE_URL='https://pdtongvzntgvwnkhkxti.supabase.co/functions/v1/ots-live';
const ZONES=['Chhatta','Hariparwat','Tajganj','Lohamandi'];
const TS={Chhatta:'Sheetal Gupta',Hariparwat:'Akshay Kumar',Tajganj:'Rambabu',Lohamandi:'Rambabu'};
const RI_PRINT_ORDER={
 Chhatta:['Rohit Verma','Anamika Yadav','Vikram Sharma','Sapan Singh','Sharafat Ali'],
 Hariparwat:['Nitin Karnwal','Rupali Gupta','Akashdeep','Kiran Sharma','Yadvendra Kumar','Dharmendra Sharma'],
 Tajganj:['Sandeep Kumar Maurya','Veer Singh','Deepa Pandey','Shamsher Singh','Saleem Khan','Virendra Chandel'],
 Lohamandi:['Jivendra Prakash','Abhishek Dubey','Meghna Gautam','Ramveer Singh','Shailendra Rathore','Sanjay Mohan Kulshreshtha']
};
const $=id=>document.getElementById(id);
const S=v=>String(v??'').trim(), N=v=>Number(v)||0, L=v=>S(v).toLowerCase().replace(/\s+/g,' ');
const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>N(v).toLocaleString('en-IN');
const money=v=>'₹'+N(v).toLocaleString('en-IN',{minimumFractionDigits:N(v)%1?2:0,maximumFractionDigits:2});
const pct=(a,b)=>N(b)?((N(a)/N(b))*100).toFixed(1)+'%':'—';
const appNo=r=>S(r?.['Application number']||r?.AppNo||r?.['Application No']||r?.['Application No.']);
const appName=r=>S(r?.['Applicant / owner']||r?.['Name of Applicant']||r?.['Name Of Applicant']||r?.['Payer name']);
const zoneOf=r=>S(r?.['Allocated zone']||r?.['Property zone']||r?._r?.zone||r?.zone);
const wardOf=r=>S(r?.['Allocated ward']||r?.['Property ward']||r?._r?.ward||r?.ward);
const riOf=r=>S(r?.['Allocated RI / TC']||r?.['Property RI']||r?._r?.ri||r?.ri);
const mobileOf=r=>S(r?.['Contact mobile']||r?.['Mobile No.']||r?.['Mobile (masked)']||r?.Mobile);
const state={history:null,historyMeta:null,historyDetail:null,ready:false,loadingReleased:false};
function releaseInitialLoading(force=false){
 if(state.loadingReleased)return;
 const hasData=!!S((window.SHARED_LIVE||PUBLIC)?.snapshot);
 if(!hasData&&!force)return;
 state.loadingReleased=true;
 const el=document.getElementById('otsLoadingScreen');
 if(el){el.classList.add('is-ready');setTimeout(()=>el.remove(),600)}
}
function payload(){return state.history||window.SHARED_LIVE||PUBLIC}
function control(z='All'){const p=payload();return z==='All'?(p.city||{}):(p.zones?.[z]||{})}
function daily(z='All'){const p=payload();return z==='All'?(p.cityDaily||[]):(p.zoneDaily?.[z]||[])}
function paymentMetric(z='All'){const p=payload(),m=p.paymentMetrics;return z==='All'?(m?.city||{}):(m?.zones?.[z]||{})}
function started(z='All'){const c=control(z),m=paymentMetric(z);return N(m.paymentStartedApproved??c.paymentStartedApproved??c.payingApps)}
function done(z='All'){const c=control(z),m=paymentMetric(z);const v=m.fullPaidApproved??c.fullPaidApproved;return v==null?null:N(v)}
function pending(z='All'){const c=control(z),m=paymentMetric(z);const v=m.paymentPendingApproved??c.paymentPendingApproved;return v==null?Math.max(0,N(c.approved)-started(z)):N(v)}
function online(z='All'){const p=payload();return z==='All'?(p.onlineCity||{receipts:0,amount:0,applicants:0}):(p.onlineByZone?.[z]||{receipts:0,amount:0,applicants:0})}
function collection(z='All'){const rows=daily(z),snap=S(payload()?.snapshot),today=rows.find(r=>S(r.date)===snap)||{};return{daily:rows,total:rows.reduce((a,r)=>a+N(r.amount),0),receipts:rows.reduce((a,r)=>a+N(r.receipts),0),today:N(today.amount),todayReceipts:N(today.receipts),asof:snap}}
function fmtDate(v){if(!v)return'—';const d=new Date(v+'T00:00:00');return Number.isNaN(d.getTime())?S(v):d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
function fmtStamp(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?S(v):d.toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true})}
function clock(){return new Date().toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true})}
function nextSchedule(){const times=[[9,0],[14,0],[17,30],[21,0]],now=new Date();for(const [h,m] of times){const d=new Date(now);d.setHours(h,m,0,0);if(d>now)return d.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit',hour12:true})}const d=new Date(now);d.setDate(d.getDate()+1);d.setHours(9,0,0,0);return d.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit',hour12:true})}
function svgSearch(){return'<svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.4" stroke-width="1.8"></circle><path d="M16 16l4.2 4.2" stroke-width="1.8" stroke-linecap="round"></path></svg>'}
function svgCal(){return'<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15" rx="2.2" stroke-width="1.6"></rect><path d="M7.5 3.5V7M16.5 3.5V7M3.8 9h16.4" stroke-width="1.6" stroke-linecap="round"></path></svg>'}
function stageLabel(s){return s==='With Applicant'?'With Applicant':s}
function stageStats(z='All'){const p=payload(),src=z==='All'?(p.workflowCity||{}):(p.stageByZone?.[z]||{}),vals={CTO:N(src.CTO),RI:N(src.RI),TS:N(src.TS),'With Applicant':N(src['With Applicant']),Other:N(src.Other)};const stageTotal=Object.values(vals).reduce((a,b)=>a+b,0),sourceTotal=N(control(z).inProcess),gap=Math.max(0,sourceTotal-stageTotal);return{...vals,gap,total:stageTotal+gap,stageTotal,sourceTotal}}
function ensure(){
 document.querySelectorAll('.toolbar,.nav,.panel,#kpis,#asof,#zone,#reportScheduleStrip').forEach(x=>x.style.setProperty('display','none','important'));
 const top=document.querySelector('.top');
 if(top&&!$('prodLiveStrip')){const x=document.createElement('div');x.id='prodLiveStrip';x.className='prod-live-strip';top.insertAdjacentElement('afterend',x)}
 if(!$('prodControlsV8')){const x=document.createElement('div');x.id='prodControlsV8';x.innerHTML='<div class="prod-v8-search"><input id="prodSearchV8" placeholder="Search applicant, application, property, ward, RI/TC, cashier or receipt…"><button type="button" id="prodSearchBtnV8" aria-label="Search">'+svgSearch()+'</button></div><div class="prod-v8-date" id="prodDateV8"><div><small>Today · live time</small><b id="prodClockV8">'+clock()+'</b></div><button class="calendar-trigger" type="button" aria-label="Open report calendar">'+svgCal()+'</button><div class="prod-calendar-pop" id="prodCalendarPop"><h4>Report Calendar</h4><p>Open any saved report date. The last scheduled update of the day remains available as that day’s final report.</p><input type="date" id="prodCalendarDate"><div class="prod-calendar-actions"><button type="button" id="prodBackLive">Back to Live</button><button type="button" class="primary" id="prodOpenDate">Open Report</button></div><div class="prod-calendar-msg" id="prodCalendarMsg"></div></div>';const anchor=$('productionDashboard')||$('kpis');(anchor?.parentNode||document.querySelector('.shell')).insertBefore(x,anchor||null);$('prodSearchBtnV8').onclick=showSearch;$('prodSearchV8').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();showSearch()}};x.querySelector('.calendar-trigger').onclick=e=>{e.stopPropagation();$('prodCalendarPop').classList.toggle('open');loadDates()};$('prodBackLive').onclick=backLive;$('prodOpenDate').onclick=()=>openDate($('prodCalendarDate').value);document.addEventListener('click',e=>{if(!x.querySelector('#prodDateV8').contains(e.target))$('prodCalendarPop')?.classList.remove('open')})}
 if(!$('productionDashboard')){const h=document.createElement('main');h.id='productionDashboard';document.querySelector('.shell').appendChild(h)}
 ensureModal();
}
function status(){
 const p=payload(),strip=$('prodLiveStrip');if(!strip)return;const has=!!S(p?.snapshot),bundled=window.__otsSharedState?.source==='bundled-seven-pdf',mode=state.history?'history':bundled?'report':has?'live':'empty';strip.dataset.mode=mode;const updated=state.historyMeta?.updated_at||(!state.history?window.__otsSharedState?.updatedAt:null);
 strip.innerHTML='<div class="prod-live-cell"><span class="prod-live-badge">'+(mode==='history'?'HISTORY':mode==='live'?'LIVE':mode==='report'?'PDF REPORT':'NO DATA')+'</span></div><div class="prod-live-cell">Report Through<b>'+esc(has?fmtDate(p.snapshot):'Awaiting upload')+'</b></div><div class="prod-live-cell">Last Updated<b>'+esc(updated?fmtStamp(updated):(bundled&&p.meta?.reconciledAt?fmtStamp(p.meta.reconciledAt):'—'))+'</b></div><div class="prod-live-cell">Manual Reports<b>7 portal reports · Upload to refresh · No scheduled automation</b></div>';
 const d=$('prodDateV8');if(d){d.querySelector('small').textContent=state.history?(state.historyMeta?.is_final?'Historical · Daily Final':'Historical report'):(bundled?'PDF export · not live':'Today · live time');$('prodClockV8').textContent=state.history?(fmtDate(p.snapshot)+(state.historyMeta?.is_final?' · Daily Final':' · Saved report')):clock()}
}
function card(label,val,sub,cls,key){return'<div class="prod-card '+cls+'" data-key="'+key+'"><div class="lab">'+esc(label)+'</div><div class="val">'+esc(val)+'</div><div class="sub">'+esc(sub)+'</div><span class="open">↗</span><span class="view">View details →</span></div>'}
function zoneCard(z){const c=control(z),m=collection(z),o=online(z),d=done(z);return'<div class="prod-zone" data-zone="'+z+'"><h4>'+z+'</h4><span class="officer">'+esc(TS[z])+'</span><div class="prod-zone-grid"><div class="prod-zstat"><span>Applications</span><b>'+number(c.applications)+'</b></div><div class="prod-zstat"><span>Approved</span><b>'+number(c.approved)+'</b></div><div class="prod-zstat"><span>In Process</span><b>'+number(c.inProcess)+'</b></div><div class="prod-zstat"><span>Rejected</span><b>'+number(c.rejected)+'</b></div><div class="prod-zstat"><span>Payment Started</span><b>'+number(started(z))+'</b></div><div class="prod-zstat"><span>Payment Done</span><b>'+(d==null?'—':number(d))+'</b></div><div class="prod-zstat"><span>Total Collection</span><b>'+money(m.total)+'</b></div><div class="prod-zstat today-line"><span>Today Collection</span><b>'+money(m.today)+' · '+number(m.todayReceipts)+' receipts</b></div><div class="prod-zstat online-line"><span>Online Paid</span><b>'+money(o.amount)+' · '+number(o.receipts)+' receipts</b></div></div><span class="prod-zview">View details →</span><button class="prod-zone-hit" type="button" aria-label="Open '+esc(z)+' zone overview"></button></div>'}
function zoneTable(){
 const labels=['Zone','TS','Applications','Approved','In Process','Payment Started','Payment Done','Online Paid','Total Collection','Today Collection'];
 const td=(label,val,attrs='')=>'<td data-label="'+esc(label)+'" '+attrs+'>'+val+'</td>';
 const rows=ZONES.map(z=>{const c=control(z),m=collection(z),o=online(z),d=done(z);return'<tr>'+td(labels[0],'<b>'+z+'</b>')+td(labels[1],esc(TS[z]))+td(labels[2],number(c.applications))+td(labels[3],number(c.approved))+td(labels[4],number(c.inProcess))+td(labels[5],number(started(z)))+td(labels[6],d==null?'—':number(d))+td(labels[7],money(o.amount),'class="online-cell" data-online="'+esc(z)+'"')+td(labels[8],money(m.total))+td(labels[9],money(m.today))+'</tr>'}).join('');
 const c=control('All'),m=collection('All'),o=online('All'),d=done('All');
 const total='<tr>'+td(labels[0],'<b>TOTAL</b>')+td(labels[1],'<b>Agra Nagar Nigam</b>')+td(labels[2],number(c.applications))+td(labels[3],number(c.approved))+td(labels[4],number(c.inProcess))+td(labels[5],number(started('All')))+td(labels[6],d==null?'—':number(d))+td(labels[7],money(o.amount),'class="online-cell" data-online="All"')+td(labels[8],money(m.total))+td(labels[9],money(m.today))+'</tr>';
 return'<div class="prod-zone-table-wrap"><table class="prod-zone-table"><thead><tr>'+labels.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody><tfoot>'+total+'</tfoot></table></div>'
}
function pendingGrid(z='All'){
 const s=stageStats(z),unallocated=Object.values(payload().workflowUnallocated||{}).reduce((n,v)=>n+N(v),0),detail=z==='All'?'Detailed report · '+number(unallocated)+' zone verification needed':'Matched detailed cases · zone summary '+number(s.sourceTotal);
 const items=[['With Applicant',s['With Applicant'],'Correction pending'],['CTO',s.CTO,'Zone / Ward / RI marking'],['RI',s.RI,'Application checking'],['TS',s.TS,'Final approval'],['Other',s.Other,'Other workflow'],...(s.gap?[['Zone attribution pending',s.gap,'Source summary cases awaiting property match']]:[]),['Total In Process',s.total,detail]];
 return items.map((x,i)=>'<div class="prod-pend '+(x[0]==='Total In Process'?'total':'')+'" data-stage="'+esc(x[0])+'" data-zone="'+esc(z)+'"><span>'+esc(x[0])+'</span><b>'+number(x[1])+'</b><small>'+esc(x[2])+'</small></div>').join('')
}
function render(){
 ensure();status();const host=$('productionDashboard'),p=payload(),snap=S(p?.snapshot);if(!host)return;
 if(snap)releaseInitialLoading(false);
 if(!snap){host.innerHTML='<div class="prod-empty"><h2>Ready for fresh OTS reports</h2><p>Upload the seven OTS reports from Manage Reports. The portal will calculate City → Zone → RI → Ward, save the report date, and preserve it after refresh.</p><button type="button" id="prodOpenReports">Upload 7 Reports</button></div>';$('prodOpenReports').onclick=()=>window.openReports?.();return}
 const c=control('All'),m=collection('All'),d=done('All'),k=[['Total Applications',number(c.applications),'Nagar Nigam total','blue','applications'],['Approved',number(c.approved),pct(c.approved,c.applications)+' of applications','green','approved'],['In Process',number(c.inProcess),'Current pending workflow','peach','inprocess'],['Rejected',number(c.rejected),'Rejected / cancelled applications','peach','rejected'],['Approved & Payment Done',d==null?'—':number(d),'FULL payment completed','lav','paymentdone'],['Approved · Payment Pending',number(pending('All')),'Approved · no payment started','pink','paymentpending'],['Total Collection',money(m.total),number(m.receipts)+' receipts','cyan','collection'],['Today Collection',money(m.today),number(m.todayReceipts)+' receipts · '+fmtDate(m.asof),'blue','today'],['Demand',money(c.demand),'OTS demand control','green','demand'],['Recovery vs Demand',pct(m.total,c.demand),'Collection against demand','peach','recovery']];
 const rows=m.daily.slice(-12),max=Math.max(1,...rows.map(r=>N(r.amount))),bars=rows.map(r=>'<div class="prod-bar-col"><div class="prod-bar" style="height:'+Math.max(2,Math.round(N(r.amount)/max*145))+'px"></div><b>'+esc(fmtDate(r.date).replace(/ 2026$/,''))+'</b><span>'+esc(money(r.amount))+'</span></div>').join('');
 const gap=p.meta?.unallocated||{},gapNotice=(N(gap.collection)||N(gap.applications))?'<div class="prod-hint"><i>!</i><span>Source zone unclear: '+number(gap.applications)+' applications and '+money(gap.collection)+' ('+number(gap.receipts)+' receipts). Included in city totals; excluded from the four zone totals. Open Total Collection for details.</span></div>':'';
 host.innerHTML='<div class="prod-hint"><i>↗</i><span>Tap or click any highlighted block for detailed information.</span></div><section class="prod-kpis">'+k.map(x=>card(...x)).join('')+'</section>'+gapNotice+'<section class="prod-section"><div class="prod-section-head"><h3>Zone-wise Position</h3><span>Applications · approval · payment · today collection · online · total collection</span></div><div class="prod-zones">'+ZONES.map(zoneCard).join('')+'</div></section><section class="prod-section compact"><div class="prod-section-head"><div><h3>Zone-wise Officer Table</h3><span>Tap Online Paid amount for applicant/receipt detail</span></div><button type="button" class="prod-inline-action" id="prodExportDashboardPDF">Print Table / PDF</button></div>'+zoneTable()+'</section><div class="prod-bottom-grid"><section class="prod-section"><div class="prod-section-head"><div><h3>Pending Responsibility</h3><span>Exact current workflow</span></div><div class="prod-head-actions"><button type="button" class="prod-inline-action" id="prodPrintPending">Print</button><button type="button" class="prod-inline-action" id="prodDownloadPending">Download PDF</button></div></div><div class="prod-pendency">'+pendingGrid('All')+'</div></section><section class="prod-section"><div class="prod-section-head"><h3>Collection Trend</h3><span>Through '+esc(fmtDate(m.asof))+'</span></div><div class="prod-trend">'+(bars||'<div class="prod-modal-empty">No collection rows.</div>')+'</div></section></div>';
 host.querySelectorAll('.prod-zone-hit').forEach(btn=>btn.onclick=e=>{e.stopPropagation();showZone(btn.closest('.prod-zone').dataset.zone)});
 const pdfBtn=$('prodExportDashboardPDF');if(pdfBtn)pdfBtn.onclick=exportZoneOfficerTablePDF;
 const pp=$('prodPrintPending');if(pp)pp.onclick=exportPendingResponsibilityPrint;
 const pd=$('prodDownloadPending');if(pd)pd.onclick=()=>downloadPendingResponsibilityPDF(pd);
}
function ensureModal(){if($('prodModal'))return;const m=document.createElement('div');m.id='prodModal';m.className='prod-modal';m.innerHTML='<div class="prod-sheet"><div class="prod-modal-head"><div><h2 id="prodModalTitle">Details</h2><p id="prodModalSub"></p></div><div class="prod-modal-actions" id="prodModalActions"></div><button class="prod-close" type="button">×</button></div><div class="prod-modal-body" id="prodModalBody"></div></div>';document.body.appendChild(m);m.querySelector('.prod-close').onclick=closeModal;m.onclick=e=>{if(e.target===m)closeModal()}}
function closeModal(){$('prodModal')?.classList.remove('open');document.body.classList.remove('prod-modal-lock')}
function openModal(title,sub,html,pdfFn,pdfLabel='Export PDF'){ensureModal();$('prodModalTitle').textContent=title;$('prodModalSub').textContent=sub||'';$('prodModalBody').innerHTML=html;const a=$('prodModalActions');a.innerHTML='';if(pdfFn){const b=document.createElement('button');b.textContent=pdfLabel;b.onclick=pdfFn;a.appendChild(b)}$('prodModal').classList.add('open');document.body.classList.add('prod-modal-lock')}
function addModalAction(label,fn){
 const a=$('prodModalActions');if(!a)return null;const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;a.appendChild(b);return b
}
function summary(items,zone){const labels={Applications:'applications',Approved:'approved','In Process':'inprocess',Rejected:'rejected','Payment Started':'paymentstarted','Payment Done':'paymentdone','Payment Pending':'paymentpending','Today Collection':'today','Total Collection (receipts)':'collection'};return'<div class="prod-summary">'+items.map(x=>'<div class="prod-stat"'+(zone&&labels[x[0]]?' data-zone-metric="'+labels[x[0]]+'" data-zone="'+esc(zone)+'" style="cursor:pointer"':'')+'><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'</b></div>').join('')+'</div>'}
function table(headers,rows){if(!rows.length)return'<div class="prod-modal-empty">No detailed rows available for this view.</div>';return'<div class="prod-tablewrap"><table class="prod-table"><thead><tr>'+headers.map(h=>'<th'+(h.num?' class="num"':'')+'>'+esc(h.label)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr'+(r.__total?' class="prod-total-row"':'')+'>'+headers.map(h=>'<td data-label="'+esc(h.label)+'"'+(h.num?' class="num"':'')+'>'+(r[h.key]??'—')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'}
function phone(v){const raw=S(v),d=raw.replace(/\D/g,'').slice(-10);return /^[6-9]\d{9}$/.test(d)?'<a class="prod-call" href="tel:'+d+'">☎ '+esc(raw||d)+'</a>':esc(raw||'—')}
async function detailFor(date=S(payload()?.snapshot)){try{if(state.history&&state.historyDetail&&state.historyDetail.snapshot===date)return state.historyDetail;if(state.history)return await window.OTS_AUTHORITY?.loadDetail?.(date);const E=window.OTS7;if(E?.loaded&&S(E.snapshot)===date&&E.apps?.length)return{snapshot:date,apps:E.apps,payments:E.payments||[],paidRows:E.paidRows||[]};const saved=window.OTS_AUTHORITY?.detail?.()||await window.OTS_AUTHORITY?.restoreDetail?.(date);if(saved?.apps?.length)return saved;if(typeof LOCAL!=='undefined'&&LOCAL&&S(LOCAL.snapshot)===date&&Array.isArray(LOCAL.applications))return{snapshot:date,apps:LOCAL.applications,payments:LOCAL.payments||[],paidRows:E?.paidRows||[]};return saved||null}catch(e){console.error('OTS detail storage unavailable',e);if(typeof LOCAL!=='undefined'&&LOCAL&&S(LOCAL.snapshot)===date)return{snapshot:date,apps:LOCAL.applications||[],payments:LOCAL.payments||[],paidRows:[]};return null}}
function zoneChoices(mode){return'<div class="prod-zone-choice-grid">'+ZONES.map(z=>'<div class="prod-zone-choice" data-paymode="'+mode+'" data-zone="'+z+'"><span>'+(mode==='done'?'Payment Done':'Payment Pending')+'</span><b>'+number(mode==='done'?(done(z)??0):pending(z))+'</b><small>'+z+' · View applicants →</small></div>').join('')+'</div>'}
function wirePayChoices(){document.querySelectorAll('[data-paymode]').forEach(el=>el.onclick=()=>showPaymentZone(el.dataset.paymode,el.dataset.zone))}
async function openKey(k){if(k==='paymentdone'||k==='paymentpending'){openModal(k==='paymentdone'?'Approved & Payment Done':'Approved · Payment Pending','Select a zone to open applicant details',summary([[k==='paymentdone'?'Payment Done':'Payment Pending',number(k==='paymentdone'?(done('All')??0):pending('All'))],['Report Through',fmtDate(payload().snapshot)],['Rule',k==='paymentdone'?'FULL payment only':'Approved · no payment started'],['Zones','4']])+zoneChoices(k==='paymentdone'?'done':'pending'));wirePayChoices();return}if(k==='today')return showToday();if(k==='collection')return showCollection();if(k==='demand'||k==='recovery'){const c=control(),m=collection();openModal(k==='demand'?'Demand':'Recovery vs Demand','All Zones',summary([['Demand',money(c.demand)],['Collection',money(m.total)],['Recovery',pct(m.total,c.demand)],['Report Through',fmtDate(payload().snapshot)]]));return}return showApplications(k,'All')}
async function showApplications(kind,z='All'){
 openModal(kind==='approved'?'Approved Applications':kind==='inprocess'?'In Process Applications':kind==='rejected'?'Rejected Applications':'Total Applications',z,'<div class="prod-modal-empty">Loading saved application details…</div>');
 const D=await detailFor(),apps=D?.apps||D?.applications||[];
 let rows=apps.filter(a=>z==='All'||zoneOf(a)===z);
 if(kind==='approved')rows=rows.filter(a=>L(a['Application status'])==='approved');
 if(kind==='inprocess')rows=rows.filter(a=>L(a['Application status'])!=='approved'&&!/reject|cancel/.test(L(a['Application status'])));
 if(kind==='rejected')rows=rows.filter(a=>/reject|cancel/.test(L(a['Application status'])));
 if(kind==='inprocess')rows=sortStageRows(rows);
 const cc=control(z);
 let html=summary([['Applications',number(cc.applications)],['Approved',number(cc.approved)],['In Process',number(cc.inProcess)],['Rejected',number(cc.rejected)],['View',z]]);
 if(rows.length)html+='<h3 class="prod-section-title">Application Detail</h3>'+table([{key:'app',label:'Application'},{key:'name',label:'Applicant / Owner'},{key:'mobile',label:'Mobile'},{key:'uid',label:'Property UID'},{key:'address',label:'Address / House'},{key:'zone',label:'Zone'},{key:'ward',label:'Ward'},{key:'ri',label:'RI / TC'},{key:'status',label:'Status'}],rows.slice(0,1200).map(a=>({app:esc(appNo(a)),name:esc(appName(a)),mobile:phone(mobileOf(a)),uid:esc(a['Property UID']||'—'),address:esc(a['House / property no.']||a['Property address']||a['Address']||'—'),zone:esc(zoneOf(a)||'—'),ward:esc(wardOf(a)||'—'),ri:esc(riOf(a)||'—'),status:esc(a['Application status']||'—')})));
 else html+='<div class="prod-modal-empty">Applicant-level detail is private to the browser where this date’s reports were uploaded.</div>';
 const title=kind==='approved'?'Approved Applications':kind==='inprocess'?'In Process Applications':kind==='rejected'?'Rejected Applications':'Total Applications';
 if(kind==='inprocess'){
   openModal(title,z,html,()=>exportStagePendencyPrint('Total In Process',z,rows),'Print');
   if(rows.length){const b=addModalAction('Download PDF',()=>downloadStagePendencyPDF('Total In Process',z,rows,b))}
 }else openModal(title,z,html)
}
function sortStageRows(rows){
 return [...rows].sort((a,b)=>{
  const z=S(zoneOf(a)).localeCompare(S(zoneOf(b)));if(z)return z;
  const r=S(riOf(a)).localeCompare(S(riOf(b)));if(r)return r;
  const w=S(wardOf(a)).localeCompare(S(wardOf(b)),undefined,{numeric:true});if(w)return w;
  return S(appName(a)).localeCompare(S(appName(b)))
 })
}
async function showStage(stage,z='All'){
 openModal(stage+' Pending',z,'<div class="prod-modal-empty">Loading saved application details…</div>');
 const D=await detailFor(),apps=D?.apps||[],isOther=stage==='Other',effectiveZone=z;
 let rows=apps.filter(a=>L(a['Application status'])!=='approved'&&!/reject|cancel/.test(L(a['Application status']))&&(effectiveZone==='All'||zoneOf(a)===effectiveZone));
 rows=rows.filter(a=>{const p=L(a['Pending with']);if(stage==='With Applicant')return p.includes('applicant')||p.startsWith('respected');if(stage==='CTO')return p.includes('cto');if(stage==='RI')return /\bri\b/.test(p)||p.includes('(ri)');if(stage==='TS')return /\bts\b/.test(p)||p.includes('(ts)');if(isOther)return !p.includes('applicant')&&!p.includes('cto')&&!/\bri\b/.test(p)&&!p.includes('(ri)')&&!/\bts\b/.test(p)&&!p.includes('(ts)');return false});
 rows=sortStageRows(rows);
 const st=stageStats(effectiveZone),scopeLabel=effectiveZone==='All'?'Nagar Nigam Agra':effectiveZone;
 let html=summary([[stage,number(stage==='Other'?st.Other+(st.gap||0):st[stage]||0)],['Scope',scopeLabel],['Total In Process',number(st.total)],['Report Through',fmtDate(payload().snapshot)]]);
 if(rows.length)html+='<h3 class="prod-section-title">Exact Applications at this Stage</h3>'+table([{key:'app',label:'Application'},{key:'name',label:'Applicant / Owner'},{key:'mobile',label:'Mobile'},{key:'address',label:'Address / House'},{key:'zone',label:'Zone'},{key:'ward',label:'Ward'},{key:'ri',label:'RI / TC'},{key:'pending',label:'Pending With'}],rows.slice(0,1200).map(a=>({app:esc(appNo(a)),name:esc(appName(a)),mobile:phone(mobileOf(a)),address:esc(a['House / property no.']||a['Property address']||a['Address']||'—'),zone:esc(zoneOf(a)||'—'),ward:esc(wardOf(a)||'—'),ri:esc(riOf(a)||'—'),pending:esc(a['Pending with']||'—')})));
 if(!rows.length)html+='<div class="prod-modal-empty">Individual applications for this report date are saved only in the browser used for the upload. Upload the seven reports here to see names, mobile numbers and addresses.</div>';
 if(st.gap&&effectiveZone!=='All')html+='<div class="prod-modal-empty">'+number(st.gap)+' additional '+esc(effectiveZone)+' in-process application(s) exist in the Zone/Ward control but do not yet have safe individual property-zone evidence. They are counted in the total but not guessed into an officer stage.</div>';
 openModal(stage+' Pendency',scopeLabel,html,()=>exportStagePendencyPrint(stage,effectiveZone,rows),'Print');
 if(rows.length){const b=addModalAction('Download PDF',()=>downloadStagePendencyPDF(stage,effectiveZone,rows,b))}
}
function officerKey(v){return L(v).replace(/\b(?:ri|tc)\b/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
function riRank(z,ri){
 const order=RI_PRINT_ORDER[z]||[],x=officerKey(ri);
 const i=order.findIndex(n=>officerKey(n)===x);
 return i>=0?i:999
}
function sortCallingRows(z,rows){
 return [...rows].sort((a,b)=>{
  const ar=riRank(z,a.ri),br=riRank(z,b.ri);if(ar!==br)return ar-br;
  const rn=S(a.ri).localeCompare(S(b.ri));if(rn)return rn;
  const w=S(a.ward).localeCompare(S(b.ward),undefined,{numeric:true});if(w)return w;
  return S(a.name).localeCompare(S(b.name))
 })
}
function callingListScreen(z,rows){
 const sorted=sortCallingRows(z,rows),groups=new Map();
 for(const r of sorted){const k=S(r.ri)||'Unassigned / Mapping Pending';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r)}
 let html='';
 for(const [ri,list] of groups){
  html+='<div class="calling-group"><div class="calling-group-head"><div><b>'+esc(ri)+'</b><span>'+number(list.length)+' pending applicants</span></div><div class="calling-group-actions"><button type="button" data-ri-print="'+esc(ri)+'">Print</button><button type="button" data-ri-download="'+esc(ri)+'">Download PDF</button></div></div>'+
  table([{key:'sno',label:'S.No.'},{key:'name',label:'Applicant / Owner'},{key:'mobile',label:'Call'},{key:'app',label:'Application'},{key:'uid',label:'Property UID'},{key:'house',label:'House No.'},{key:'ward',label:'Ward'}],list.map((r,i)=>({sno:number(i+1),name:esc(r.name||'—'),mobile:phone(r.mobile),app:esc(r.app||'—'),uid:esc(r.uid||'—'),house:esc(r.house||'—'),ward:esc(r.ward||'—')})))+
  '</div>'
 }
 return html
}
function groupCallingRows(z,rows){
 const map=new Map();
 for(const r of sortCallingRows(z,rows)){const k=S(r.ri)||'Unassigned / Mapping Pending';if(!map.has(k))map.set(k,[]);map.get(k).push(r)}
 return map
}
function wireCallingGroupActions(z,rows){
 const groups=groupCallingRows(z,rows);
 document.querySelectorAll('[data-ri-print]').forEach(b=>b.onclick=()=>{const ri=S(b.dataset.riPrint),list=groups.get(ri)||[];exportPendingRIPrint(z,ri,list)});
 document.querySelectorAll('[data-ri-download]').forEach(b=>b.onclick=()=>{const ri=S(b.dataset.riDownload),list=groups.get(ri)||[];downloadPendingRIPDF(z,ri,list,b)})
}
async function showPaymentZone(mode,z){
 openModal((mode==='done'?'Payment Done · ':'Payment Pending · ')+z,z,'<div class="prod-modal-empty">Loading saved applicant details…</div>');
 const D=await detailFor(),apps=D?.apps||[],paid=D?.paidRows||[],payments=D?.payments||[],amap=new Map(apps.map(a=>[appNo(a),a]));let rows=[];
 if(mode==='done'){
  const seen=new Set();
  for(const r of paid){const k=appNo(r),a=amap.get(k);if(!k||seen.has(k)||S(r['Payment state']).toUpperCase()!=='FULL'||!a||L(a['Application status'])!=='approved'||zoneOf(a)!==z)continue;seen.add(k);rows.push({app:k,name:appName(a)||r['Applicant / owner'],mobile:mobileOf(a),uid:a['Property UID']||r['Property UID'],house:a['House / property no.']||r['House / property no.'],ward:wardOf(a),ri:riOf(a),paid:N(r['Total paid'])})}
 }else{
  const paidSet=new Set([...paid,...payments].map(appNo).filter(Boolean));
  rows=apps.filter(a=>L(a['Application status'])==='approved'&&zoneOf(a)===z&&!paidSet.has(appNo(a))).map(a=>({app:appNo(a),name:appName(a),mobile:mobileOf(a),uid:a['Property UID'],house:a['House / property no.'],ward:wardOf(a),ri:riOf(a)}));
  rows=sortCallingRows(z,rows)
 }
 let html=summary([[z,number(mode==='done'?(done(z)??0):pending(z))],['Approved',number(control(z).approved)],['Payment Started',number(started(z))],['Collection',money(collection(z).total)]]);
 if(rows.length){
  html+='<h3 class="prod-section-title">'+(mode==='done'?'FULL Payment Completed':'Volunteer Calling List · RI / TC-wise')+'</h3>';
  if(mode==='done'){
   html+=table([{key:'app',label:'Application'},{key:'name',label:'Applicant / Owner'},{key:'mobile',label:'Mobile'},{key:'uid',label:'Property UID'},{key:'house',label:'House No.'},{key:'ward',label:'Ward'},{key:'ri',label:'RI / TC'},{key:'paid',label:'Paid',num:true}],rows.slice(0,1200).map(r=>({...r,app:esc(r.app),name:esc(r.name||'—'),mobile:phone(r.mobile),uid:esc(r.uid||'—'),house:esc(r.house||'—'),ward:esc(r.ward||'—'),ri:esc(r.ri||'—'),paid:money(r.paid)})))
  }else html+=callingListScreen(z,rows)
 }else html+='<div class="prod-modal-empty">Applicant-level detail is available on the browser where this date’s reports were uploaded.</div>';
 openModal((mode==='done'?'Payment Done · ':'Payment Pending · ')+z,mode==='done'?'Approved applicants with FULL payment completed':'Approved applicants to call for payment follow-up · grouped RI/TC-wise',html,mode==='pending'&&rows.length?()=>exportPendingCallingListPDF(z,rows):null,mode==='pending'?'Print Complete Zone List / PDF':'Export PDF');
 if(mode==='pending'&&rows.length)wireCallingGroupActions(z,rows)
}
async function showOnline(z='All'){openModal('Online Paid · '+z,z,'<div class="prod-modal-empty">Loading saved receipt details…</div>');const o=online(z),D=await detailFor(),apps=D?.apps||[],payments=D?.payments||[],amap=new Map(apps.map(a=>[appNo(a),a]));const rows=payments.filter(p=>L(p['Cashier / channel'])==='online'&&(z==='All'||S(p['Property zone']||p['Allocated zone'])===z));let html=summary([['Online Collection',money(o.amount)],['Online Receipts',number(o.receipts)],['Applicants',number(o.applicants)],['Zone',z]]);if(rows.length)html+='<h3 class="prod-section-title">Online Paid Applicant / Receipt Detail</h3>'+table([{key:'app',label:'Application'},{key:'name',label:'Applicant / Owner'},{key:'mobile',label:'Mobile'},{key:'receipt',label:'Receipt'},{key:'date',label:'Date'},{key:'zone',label:'Zone'},{key:'ward',label:'Ward'},{key:'ri',label:'RI / TC'},{key:'amount',label:'Amount',num:true}],rows.slice(0,1500).map(p=>{const a=amap.get(appNo(p))||{};return{app:esc(appNo(p)||'—'),name:esc(appName(a)||p['Payer name']||'—'),mobile:phone(mobileOf(a)||p['Mobile (masked)']),receipt:esc(p['Receipt number']||'—'),date:esc(fmtDate(p['Payment date'])),zone:esc(S(p['Property zone']||p['Allocated zone'])||'—'),ward:esc(wardOf(a)||p['Property ward']||p['Allocated ward']||'—'),ri:esc(riOf(a)||p['Property RI']||p['Allocated RI / TC']||'—'),amount:money(p['Amount (INR)'])}}));else html+='<div class="prod-modal-empty">Aggregate online amount is saved. Receipt/applicant detail is private to the browser where the reports were uploaded.</div>';openModal('Online Paid · '+z,'Online receipts and applicant information',html)}
async function showToday(){openModal('Today Collection','All Zones','<div class="prod-modal-empty">Loading saved receipt details…</div>');const m=collection('All'),D=await detailFor(),date=S(m.asof),rows=(D?.payments||[]).filter(p=>S(p['Payment date'])===date);const cash=new Map();for(const p of rows){const k=S(p['Cashier / channel'])||'Unknown',x=cash.get(k)||{name:k,receipts:0,amount:0};x.receipts++;x.amount+=N(p['Amount (INR)']);cash.set(k,x)}let html=summary([[fmtDate(date),money(m.today)],['Receipts',number(m.todayReceipts)],['View','All Zones'],['Report Through',fmtDate(payload().snapshot)]]);if(rows.length){html+='<h3 class="prod-section-title">Cashier / Channel</h3>'+table([{key:'name',label:'Cashier / Channel'},{key:'receipts',label:'Receipts',num:true},{key:'amount',label:'Collection',num:true}],[...cash.values()].sort((a,b)=>b.amount-a.amount).map(x=>({name:esc(x.name),receipts:number(x.receipts),amount:money(x.amount)})))+'<h3 class="prod-section-title">Receipts Generated</h3>'+table([{key:'receipt',label:'Receipt'},{key:'app',label:'Application'},{key:'cashier',label:'Cashier / Channel'},{key:'zone',label:'Property Zone'},{key:'amount',label:'Amount',num:true}],rows.map(p=>({receipt:esc(p['Receipt number']||'—'),app:esc(appNo(p)||'—'),cashier:esc(p['Cashier / channel']||'Unknown'),zone:esc(p['Property zone']||p['Allocated zone']||'—'),amount:money(p['Amount (INR)'])})))}else {const aggregate=payload().cashiersToday||[];if(aggregate.length){html+='<h3 class="prod-section-title">Cashier / Channel (source PDF)</h3>'+table([{key:'name',label:'Cashier / Channel'},{key:'receipts',label:'Receipts',num:true},{key:'amount',label:'Collection',num:true}],aggregate.map(x=>({name:esc(x.name),receipts:number(x.receipts),amount:money(x.amount)})))}html+='<div class="prod-modal-empty">Receipt-level details are private to the browser where reports were uploaded. Receipts generated later require a newer export.</div>';}openModal('Today Collection','Receipt count, amount and cashier detail for '+fmtDate(date),html)}
function showCollection(){const m=collection('All'),p=payload(),cash=p.cashiers||[];let cum=0;openModal('Total Collection','All Zones · cashier/channel and daily collection reconciliation',summary([['Collection',money(m.total)],['Receipts',number(m.receipts)],['Report Through',fmtDate(m.asof)],['Unallocated collection (source PDF)',money(p.meta?.unallocated?.collection||0)],['Unallocated receipts',number(p.meta?.unallocated?.receipts||0)],['Recovery',pct(m.total,control().demand)]])+'<h3 class="prod-section-title">Cashier / Channel</h3>'+table([{key:'name',label:'Cashier / Channel'},{key:'receipts',label:'Receipts',num:true},{key:'amount',label:'Collection',num:true}],cash.map(r=>({name:esc(r.name||r.cashier||'Unknown'),receipts:number(r.receipts),amount:money(r.amount)})))+'<h3 class="prod-section-title">Daily Collection</h3>'+table([{key:'date',label:'Date'},{key:'receipts',label:'Receipts',num:true},{key:'amount',label:'Collection',num:true},{key:'cum',label:'Cumulative',num:true}],m.daily.map(r=>{cum+=N(r.amount);return{date:fmtDate(r.date),receipts:number(r.receipts),amount:money(r.amount),cum:money(cum)}})))}
async function showZoneMetric(kind,z){
 if(!ZONES.includes(z))return;
 if(['applications','approved','inprocess','rejected'].includes(kind))return showApplications(kind,z);
 if(kind==='paymentdone'||kind==='paymentpending')return showPaymentZone(kind==='paymentdone'?'done':'pending',z);
 if(kind==='paymentstarted')return showPaymentStarted(z);
 if(kind==='today'||kind==='collection')return showZoneReceipts(z,kind==='today');
 return showZone(z)
}
async function showPaymentStarted(z){
 openModal('Payment Started · '+z,z,'<div class="prod-modal-empty">Loading saved payment details…</div>');
 const D=await detailFor(),apps=D?.apps||[],paid=D?.paidRows||[],payments=D?.payments||[];
 const paidApps=new Set([...paid,...payments].map(appNo).filter(Boolean));
 const rows=apps.filter(a=>zoneOf(a)===z&&paidApps.has(appNo(a)));
 let html=summary([['Payment Started',number(started(z))],['Zone',z],['Report Through',fmtDate(payload().snapshot)]]);
 html+=rows.length?table([{key:'app',label:'Application'},{key:'name',label:'Applicant / Owner'},{key:'mobile',label:'Mobile'},{key:'house',label:'House / Address'},{key:'ward',label:'Ward'},{key:'ri',label:'RI / TC'}],rows.map(a=>({app:esc(appNo(a)),name:esc(appName(a)),mobile:phone(mobileOf(a)),house:esc(a['House / property no.']||a['Master address']||'—'),ward:esc(wardOf(a)||'—'),ri:esc(riOf(a)||'—')}))):'<div class="prod-modal-empty">Individual payment rows are available in the browser that uploaded this report date.</div>';
 openModal('Payment Started · '+z,'Approved and part/full payers',html)
}
async function showZoneReceipts(z,onlyToday){
 openModal((onlyToday?'Today':'Total')+' Collection · '+z,z,'<div class="prod-modal-empty">Loading saved receipts…</div>');
 const m=collection(z),D=await detailFor(),apps=D?.apps||[],amap=new Map(apps.map(a=>[appNo(a),a]));
 const rows=(D?.payments||[]).filter(p=>S(p['Collection zone']||p['Receipt zone (source)']||p['Property zone']||p['Allocated zone'])===z&&(!onlyToday||S(p['Payment date'])===m.asof));
 let html=summary([['Zone',z],['Collection',money(onlyToday?m.today:m.total)],['Receipts',number(onlyToday?m.todayReceipts:m.receipts)],['Report Through',fmtDate(m.asof)]]);
 html+=rows.length?table([{key:'receipt',label:'Receipt'},{key:'app',label:'Application'},{key:'name',label:'Applicant / Owner'},{key:'mobile',label:'Mobile'},{key:'house',label:'House / Address'},{key:'ward',label:'Property Ward'},{key:'date',label:'Date'},{key:'amount',label:'Amount',num:true}],rows.map(p=>{const a=amap.get(appNo(p))||{};return{receipt:esc(p['Receipt number']||'—'),app:esc(appNo(p)||'—'),name:esc(appName(a)||p['Payer name']||'—'),mobile:phone(mobileOf(a)||p['Mobile (masked)']),house:esc(a['House / property no.']||p['Receipt property no.']||'—'),ward:esc(wardOf(a)||p['Property ward']||'—'),date:esc(fmtDate(p['Payment date'])),amount:money(p['Amount (INR)'])}})):'<div class="prod-modal-empty">Individual receipts are available in the browser that uploaded this report date.</div>';
 openModal((onlyToday?'Today':'Total')+' Collection · '+z,'Receipt zone · '+fmtDate(m.asof),html)
}
async function showZone(z){
 const c=control(z),m=collection(z),p=payload(),ri=(p.riRows||[]).filter(r=>r.zone===z),wards=(p.wardRows||[]).filter(r=>r.zone===z),o=online(z),st=stageStats(z);
 const stageHtml='<div class="prod-stage-grid">'+[['With Applicant',st['With Applicant'],'Correction pending'],['CTO',st.CTO,'Zone / Ward / RI marking'],['RI',st.RI,'Application checking'],['TS',st.TS,'Final approval'],['Other',st.Other,'Other workflow'],...(st.gap?[['Zone attribution pending',st.gap,'Needs exact property evidence']]:[]),['Total In Process',st.total,'Source total']].map(x=>'<div class="prod-stage-card '+(x[0]==='Total In Process'?'total':'')+'" data-stage-modal="'+esc(x[0])+'" data-zone="'+z+'"><span>'+esc(x[0])+'</span><b>'+number(x[1])+'</b><small>'+esc(x[2])+'</small></div>').join('')+'</div>';
 const riData=ri.map(r=>({ri:esc(r.ri),apps:number(r.applications),approved:number(r.approved),pending:number(r.inProcess),paid:number(r.paidApplicants),collection:money(r.collection)}));
 riData.push({__total:true,ri:'TOTAL',apps:number(ri.reduce((a,r)=>a+N(r.applications),0)),approved:number(ri.reduce((a,r)=>a+N(r.approved),0)),pending:number(ri.reduce((a,r)=>a+N(r.inProcess),0)),paid:number(ri.reduce((a,r)=>a+N(r.paidApplicants),0)),collection:money(ri.reduce((a,r)=>a+N(r.collection),0))});
 const wardAssigned=wards.reduce((sum,r)=>sum+N(r.collection),0),wardUnassigned=Math.round((m.total-wardAssigned)*100)/100;
 const wardData=wards.map(r=>({ward:esc((r.wardNo??'')+' · '+(r.ward||'')),ri:esc(r.ri),apps:number(r.applications),approved:number(r.approved),pending:number(r.inProcess),collection:money(r.collection)}));
 if(Math.abs(wardUnassigned)>0.005)wardData.push({ward:'Ward not identified in uploaded reports',ri:'—',apps:'—',approved:'—',pending:'—',collection:money(wardUnassigned)});
 wardData.push({__total:true,ward:'TOTAL',ri:'—',apps:number(wards.reduce((a,r)=>a+N(r.applications),0)),approved:number(wards.reduce((a,r)=>a+N(r.approved),0)),pending:number(wards.reduce((a,r)=>a+N(r.inProcess),0)),collection:money(m.total)});
 const html=summary([
  ['Applications',number(c.applications)],['Approved',number(c.approved)],['In Process',number(c.inProcess)],['Rejected',number(c.rejected)],
  ['Payment Started',number(started(z))],['Payment Done',done(z)==null?'—':number(done(z))],['Payment Pending',number(pending(z))],
  ['Online Paid',money(o.amount)],['Total Collection (receipts)',money(m.total)],['Assigned wards',money(wardAssigned)],['Ward unassigned (receipts)',money(wardUnassigned)],['Ward total incl. unassigned',money(wardAssigned+wardUnassigned)],['Today Collection',money(m.today)],['Today Receipts',number(m.todayReceipts)]
 ],z)+
 '<h3 class="prod-section-title">Application Pendency by Stage</h3>'+stageHtml+
 '<h3 class="prod-section-title">RI / TC Performance</h3>'+table([{key:'ri',label:'RI / TC'},{key:'apps',label:'Apps',num:true},{key:'approved',label:'Approved',num:true},{key:'pending',label:'In Process',num:true},{key:'paid',label:'Payment Started',num:true},{key:'collection',label:'Collection',num:true}],riData)+
 '<h3 class="prod-section-title">Ward Position</h3>'+table([{key:'ward',label:'Ward'},{key:'ri',label:'RI / TC'},{key:'apps',label:'Apps',num:true},{key:'approved',label:'Approved',num:true},{key:'pending',label:'In Process',num:true},{key:'collection',label:'Collection',num:true}],wardData);
 openModal(z+' Zone','Complete officer view · '+fmtDate(payload().snapshot),html,()=>exportZonePDF(z,c,m,ri,wards,o,st));
 $('prodModalBody').querySelectorAll('[data-zone-metric]').forEach(el=>el.onclick=()=>showZoneMetric(el.dataset.zoneMetric,z));
 document.querySelectorAll('[data-stage-modal]').forEach(el=>el.onclick=()=>{if(el.dataset.stageModal==='Total In Process')showApplications('inprocess',z);else if(el.dataset.stageModal==='Zone attribution pending')showApplications('inprocess',z);else showStage(el.dataset.stageModal,z)})
}
function reportWindow(title,bodyHtml,orientation='portrait'){
 const w=window.open('','_blank','width=1100,height=900');
 if(!w){alert('Please allow pop-ups once for PDF export.');return null}
 const pageSize=orientation==='landscape'?'A4 landscape':'A4 portrait';
 const css=`@page{size:${pageSize};margin:10mm}
 *{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
 html,body{margin:0;padding:0;background:#fff;color:#15191d;font-family:Arial,"Noto Sans Devanagari",sans-serif}
 body{font-size:9pt}
 .page{width:100%;page-break-after:always}.page:last-child{page-break-after:auto}
 .report-head{text-align:center;margin:0 0 12mm}
 .report-head h1{margin:0;font-size:20pt;line-height:1.05;color:#111;font-weight:900;letter-spacing:.01em}
 .report-head .sub{margin-top:7px;font-size:9.5pt;color:#4d5359;font-weight:500}
 .section-title{font-size:11pt;color:#182b3b;font-weight:900;margin:10px 0 5px}
 table{width:100%;border-collapse:collapse;table-layout:fixed;margin:0}
 thead{display:table-header-group}tfoot{display:table-row-group}
 tr{page-break-inside:avoid}
 th,td{border:1px solid #aebbc6;padding:7px 6px;vertical-align:middle;overflow-wrap:anywhere}
 th{background:#e5edf6;color:#263746;font-size:8pt;font-weight:900;text-align:center;line-height:1.2}
 td{font-size:8.6pt;color:#171b1f;background:#fff;line-height:1.25}
 tbody tr:nth-child(even) td{background:#f7f9fb}
 td:first-child{font-weight:800}
 tfoot td,.total-row td{background:#dce8f3!important;color:#111;font-weight:900;border-top:2px solid #8197a8}
 .num{text-align:right}.center{text-align:center}.left{text-align:left}
 .wide th,.wide td{font-size:7.3pt;padding:6px 4px}
 .compact th,.compact td{padding:5px 5px}
 .summary-table{margin-bottom:9px}
 .summary-table th{width:35%;text-align:left}.summary-table td{font-weight:800}
 .zone-one-page .report-head{margin-bottom:6mm}
 .zone-top{display:grid;grid-template-columns:1.2fr .8fr;gap:7px;align-items:start;margin-bottom:6px}
 .zone-summary,.zone-stage{margin:0}
 .zone-one-page .section-title{font-size:9pt;margin:6px 0 3px}
 .zone-one-page th,.zone-one-page td{padding:3px 3.5px}
 .zone-one-page .ri-table th,.zone-one-page .ri-table td{font-size:6.9pt}
 .zone-one-page .ward-table th,.zone-one-page .ward-table td{font-size:6.4pt;padding:2.8px 3px;line-height:1.1}
 .zone-one-page .ward-title{margin-top:5px}
 .zone-one-page .footer{margin-top:4px}
 .zone-one-page .ward-table th:nth-child(1){width:8%}.zone-one-page .ward-table th:nth-child(2){width:26%}.zone-one-page .ward-table th:nth-child(3){width:22%}.zone-one-page .ward-table th:nth-child(4),.zone-one-page .ward-table th:nth-child(5),.zone-one-page .ward-table th:nth-child(6){width:9%}.zone-one-page .ward-table th:nth-child(7){width:17%}
 .zone-one-page .ri-table th:nth-child(1){width:28%}.zone-one-page .ri-table th:nth-child(2),.zone-one-page .ri-table th:nth-child(3),.zone-one-page .ri-table th:nth-child(4),.zone-one-page .ri-table th:nth-child(5){width:11%}.zone-one-page .ri-table th:nth-child(6){width:28%}
 .footnote{font-size:7pt;color:#5d6770;margin-top:6px}
 .footer{margin-top:8px;padding-top:5px;border-top:1px solid #cbd4dc;font-size:7pt;color:#67727b;display:flex;justify-content:space-between}
 .calling-page .report-head{margin-bottom:5mm}
 .call-summary{display:flex;justify-content:space-between;gap:12px;padding:7px 9px;margin-bottom:8px;border:1px solid #b9c7d2;background:#eef4f8;font-size:9pt;color:#1c3447}
 .call-group{margin:0 0 10px;break-inside:auto;page-break-inside:auto}
 .call-group.next-ri{break-before:page;page-break-before:always;margin-top:0}
 .call-ri{display:flex;justify-content:space-between;align-items:center;background:#dce8f3;border:1px solid #9eafbd;border-bottom:0;padding:7px 9px;color:#132f45}
 .call-ri span{font-size:11pt;font-weight:900}.call-ri b{font-size:9pt}
 .call-table{table-layout:fixed}
 .call-table .ri-repeat th{background:#dce8f3;color:#132f45;font-size:10pt;text-align:left;padding:7px 8px}
 .call-table th,.call-table td{font-size:8.8pt;padding:6px 5px;line-height:1.2}
 .call-table th:nth-child(1){width:5%}.call-table th:nth-child(2){width:18%}.call-table th:nth-child(3){width:12%}.call-table th:nth-child(4){width:20%}.call-table th:nth-child(5){width:20%}.call-table th:nth-child(6){width:13%}.call-table th:nth-child(7){width:12%}
 .call-table .phone-cell{font-size:10pt;font-weight:900;letter-spacing:.02em;color:#111}
 .call-table .remark{height:28px}
 .stage-detail-table{table-layout:fixed}
 .stage-detail-table th,.stage-detail-table td{font-size:8pt;padding:5px 4px}
 .stage-detail-table th:nth-child(1){width:5%}.stage-detail-table th:nth-child(2){width:17%}.stage-detail-table th:nth-child(3){width:18%}.stage-detail-table th:nth-child(4){width:11%}.stage-detail-table th:nth-child(5){width:10%}.stage-detail-table th:nth-child(6){width:13%}.stage-detail-table th:nth-child(7){width:13%}.stage-detail-table th:nth-child(8){width:13%}
 @media print{body{background:#fff}.page{break-inside:avoid}}`;
 w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'+esc(title)+'</title><style>'+css+'</style></head><body>'+bodyHtml+'<script>window.onload=()=>setTimeout(()=>window.print(),220)<\/script></body></html>');
 w.document.close();
 return w
}
function cleanHead(title,subtitle){
 return '<div class="report-head"><h1>'+esc(title)+'</h1><div class="sub">'+esc(subtitle)+'</div></div>'
}
function exportZoneOfficerTablePDF(){
 const p=payload(),snap=fmtDate(p.snapshot),todayLabel=fmtDate(p.snapshot).replace(/\s+\d{4}$/,'')+' Today';
 const zrows=ZONES.map(z=>{
  const c=control(z),m=collection(z);
  return '<tr><td>'+esc(z)+'</td><td>'+esc(TS[z]||'—')+'</td><td class="center">'+number(c.applications)+'</td><td class="center">'+number(c.approved)+'</td><td class="center">'+number(c.inProcess)+'</td><td class="center">'+number(c.rejected)+'</td><td class="center">'+number(started(z))+'</td><td class="center">'+number(pending(z))+'</td><td class="num">'+money(m.total)+'</td><td class="num">'+money(m.today)+'</td><td class="num">'+money(Math.max(0,m.total-m.today))+'</td></tr>'
 }).join('');
 const c=control('All'),m=collection('All');
 const total='<tr class="total-row"><td>TOTAL</td><td>Agra Nagar Nigam</td><td class="center">'+number(c.applications)+'</td><td class="center">'+number(c.approved)+'</td><td class="center">'+number(c.inProcess)+'</td><td class="center">'+number(c.rejected)+'</td><td class="center">'+number(started('All'))+'</td><td class="center">'+number(pending('All'))+'</td><td class="num">'+money(m.total)+'</td><td class="num">'+money(m.today)+'</td><td class="num">'+money(Math.max(0,m.total-m.today))+'</td></tr>';
 const body='<section class="page">'+cleanHead('AGRA NAGAR NIGAM · OTS DATA','Zone-wise Officer Status and Collection Summary | '+snap)+'<table class="wide"><thead><tr><th>Zone</th><th>TS</th><th>Applications</th><th>Approved</th><th>In Process</th><th>Rejected</th><th>Paid Applicants</th><th>Unpaid Approved</th><th>Total Collection</th><th>'+esc(todayLabel)+'</th><th>Previous Days</th></tr></thead><tbody>'+zrows+'</tbody><tfoot>'+total+'</tfoot></table><div class="footer"><span>नगर निगम आगरा</span><span>OTS 2026-27</span></div></section>';
 reportWindow('Zone-wise Officer OTS Data',body,'landscape')
}
function safeReportName(v){return S(v).replace(/[<>:"/\\|?*]+/g,'-').replace(/\s+/g,' ').trim()}
function reportFileBase(report,scope=''){
 const date=fmtDate(payload().snapshot);
 return safeReportName(report+(scope?' - '+scope:'')+' - '+date)
}
function pendingResponsibilityRows(){
 const rows=ZONES.map(z=>{const s=stageStats(z);return[z,s['With Applicant'],s.CTO,s.RI,s.TS,s.Other,s.total]});
 const u=payload().workflowUnallocated||{},v=['With Applicant','CTO','RI','TS','Other'].map(k=>N(u[k]));
 const total=v.reduce((a,b)=>a+b,0);if(total)rows.push(['Zone verification needed',...v,total]);
 return rows;
}
function pendingResponsibilityTableHTML(){
 const rows=pendingResponsibilityRows(),city=stageStats('All');
 return '<table class="compact"><thead><tr><th>Zone</th><th>With Applicant</th><th>CTO</th><th>RI</th><th>TS</th><th>Other stage</th><th>Total In Process</th></tr></thead><tbody>'+
 rows.map(r=>'<tr><td>'+esc(r[0])+'</td>'+r.slice(1).map(v=>'<td class="center">'+number(v)+'</td>').join('')+'</tr>').join('')+
 '</tbody><tfoot><tr class="total-row"><td>TOTAL</td><td class="center">'+number(city['With Applicant'])+'</td><td class="center">'+number(city.CTO)+'</td><td class="center">'+number(city.RI)+'</td><td class="center">'+number(city.TS)+'</td><td class="center">'+number(city.Other)+'</td><td class="center">'+number(city.total)+'</td></tr></tfoot></table>'+
 (city.total!==city.sourceTotal||ZONES.reduce((n,z)=>n+N(control(z).inProcess),0)!==city.total?'<p>Source difference: detailed pending '+number(city.total)+'; received-applications status '+number(city.sourceTotal)+'; zone/ward summary '+number(ZONES.reduce((n,z)=>n+N(control(z).inProcess),0))+'. Counts have not been forced to match.</p>':'')
}
function exportPendingResponsibilityPrint(){
 const snap=fmtDate(payload().snapshot),title=reportFileBase('Pending Responsibility');
 const body='<section class="page">'+cleanHead('PENDING RESPONSIBILITY','Zone-wise OTS Workflow Pendency | '+snap)+pendingResponsibilityTableHTML()+'<div class="footer"><span>नगर निगम आगरा · OTS 2026-27</span><span>'+esc(snap)+'</span></div></section>';
 reportWindow(title,body,'landscape')
}
async function downloadPendingResponsibilityPDF(button){
 const old=button?.textContent;if(button){button.disabled=true;button.textContent='Preparing…'}
 try{
  await ensurePDFDownloadLib();
  const {jsPDF}=window.jspdf,doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),snap=fmtDate(payload().snapshot);
  doc.setFont('helvetica','bold');doc.setTextColor(18,47,69);doc.setFontSize(17);doc.text('PENDING RESPONSIBILITY',148.5,14,{align:'center'});
  doc.setFont('helvetica','normal');doc.setTextColor(75,85,94);doc.setFontSize(9);doc.text('Zone-wise OTS Workflow Pendency · '+snap,148.5,20,{align:'center'});
  const city=stageStats('All'),body=pendingResponsibilityRows().map(r=>[r[0],...r.slice(1).map(v=>String(v))]);
  body.push(['TOTAL',String(city['With Applicant']),String(city.CTO),String(city.RI),String(city.TS),String(city.Other),String(city.total)]);
  doc.autoTable({startY:25,head:[['Zone','With Applicant','CTO','RI','TS','Other stage','Total In Process']],body,theme:'grid',styles:{fontSize:10,cellPadding:3,textColor:[20,24,28],lineColor:[170,184,195],lineWidth:.25,halign:'center'},headStyles:{fillColor:[229,237,246],textColor:[38,55,70],fontStyle:'bold'},didParseCell:d=>{if(d.row.index===body.length-1){d.cell.styles.fillColor=[220,232,243];d.cell.styles.fontStyle='bold'}}});
  const zoneTotal=ZONES.reduce((n,z)=>n+N(control(z).inProcess),0);
  if(city.total!==city.sourceTotal||city.total!==zoneTotal){doc.setFontSize(9);doc.text('Source difference: detailed pending '+city.total+'; received-applications status '+city.sourceTotal+'; zone/ward summary '+zoneTotal+'. Counts were not forced to match.',14,doc.lastAutoTable.finalY+8)}
  doc.save(reportFileBase('Pending Responsibility')+'.pdf')
 }catch(e){alert('Direct PDF download could not start. Use Print and choose Save as PDF. '+String(e?.message||e))}
 finally{if(button){button.disabled=false;button.textContent=old}}
}
function stageReportScope(stage,z){return z==='All'?'Nagar Nigam Agra':z}
function stageReportFileBase(stage,z){
 const report=stage+' Pendency';
 return reportFileBase(report,stageReportScope(stage,z))
}
function stageRowsForPDF(rows){
 return rows.map((a,i)=>[String(i+1),S(appNo(a))||'—',S(appName(a))||'—',S(mobileOf(a))||'—',S(zoneOf(a))||'—',S(wardOf(a))||'—',S(riOf(a))||'—',S(a['Pending with'])||'—'])
}
function stageTableHTML(rows){
 const data=stageRowsForPDF(rows);
 return '<table class="stage-detail-table"><thead><tr><th>S.No.</th><th>Application</th><th>Applicant / Owner</th><th>Mobile</th><th>Zone</th><th>Ward</th><th>RI / TC</th><th>Pending With</th></tr></thead><tbody>'+
 data.map(r=>'<tr>'+r.map((v,i)=>'<td class="'+(i===0?'center':'')+'">'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody><tfoot><tr class="total-row"><td colspan="7">TOTAL APPLICATIONS</td><td class="center">'+number(rows.length)+'</td></tr></tfoot></table>'
}
function exportStagePendencyPrint(stage,z,rows){
 const scope=stageReportScope(stage,z),snap=fmtDate(payload().snapshot),report=stage+' Pendency',title=stageReportFileBase(stage,z);
 const body='<section class="page stage-report-page">'+cleanHead(report.toUpperCase(),scope+' | '+snap)+'<div class="call-summary"><b>Total Applications: '+number(rows.length)+'</b><span>'+esc(scope)+'</span></div>'+stageTableHTML(rows)+'<div class="footer"><span>नगर निगम आगरा · OTS 2026-27</span><span>'+esc(report)+'</span></div></section>';
 reportWindow(title,body,'landscape')
}
async function downloadStagePendencyPDF(stage,z,rows,button){
 const old=button?.textContent;if(button){button.disabled=true;button.textContent='Preparing…'}
 try{
  await ensurePDFDownloadLib();
  const {jsPDF}=window.jspdf,doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),scope=stageReportScope(stage,z),snap=fmtDate(payload().snapshot),report=stage+' Pendency';
  doc.setFont('helvetica','bold');doc.setTextColor(18,47,69);doc.setFontSize(16);doc.text(report.toUpperCase(),148.5,13,{align:'center'});
  doc.setFont('helvetica','normal');doc.setTextColor(70,80,88);doc.setFontSize(9);doc.text(scope+' · '+snap+' · '+rows.length+' Applications',148.5,19,{align:'center'});
  doc.autoTable({
   startY:24,
   head:[['S.No.','Application','Applicant / Owner','Mobile','Zone','Ward','RI / TC','Pending With']],
   body:stageRowsForPDF(rows),
   theme:'grid',
   styles:{font:'helvetica',fontSize:8.3,textColor:[20,24,28],cellPadding:2.2,valign:'middle',lineColor:[170,184,195],lineWidth:.25},
   headStyles:{fillColor:[229,237,246],textColor:[38,55,70],fontStyle:'bold',halign:'center',fontSize:8.1},
   alternateRowStyles:{fillColor:[248,250,252]},
   columnStyles:{0:{cellWidth:10,halign:'center'},1:{cellWidth:43},2:{cellWidth:42},3:{cellWidth:27,fontStyle:'bold'},4:{cellWidth:24},5:{cellWidth:34},6:{cellWidth:35},7:{cellWidth:49}},
   margin:{left:8,right:8,bottom:10},
   didDrawPage:()=>{doc.setFontSize(7);doc.setTextColor(95,105,114);doc.text('Agra Nagar Nigam · OTS 2026-27 · '+report,8,203);doc.text('Page '+doc.internal.getNumberOfPages(),289,203,{align:'right'})}
  });
  doc.save(stageReportFileBase(stage,z)+'.pdf')
 }catch(e){alert('Direct PDF download could not start. Use Print and choose Save as PDF. '+String(e?.message||e))}
 finally{if(button){button.disabled=false;button.textContent=old}}
}
function callingFileBase(z,ri){
 const d=fmtDate(payload().snapshot),safe=v=>S(v).replace(/[<>:"/\\|?*]+/g,'-').replace(/\s+/g,' ').trim();
 return safe(z+' - '+ri+' - Payment Pending Calling List - '+d)
}
function callingRowsHTML(ri,list){
 const body=list.map((r,i)=>'<tr><td class="center">'+number(i+1)+'</td><td>'+esc(r.name||'—')+'</td><td class="phone-cell">'+esc(r.mobile||'—')+'</td><td>'+esc(r.app||'—')+'</td><td>'+esc(r.uid||r.house||'—')+'</td><td>'+esc(r.ward||'—')+'</td><td class="remark"></td></tr>').join('');
 return '<table class="call-table"><thead><tr class="ri-repeat"><th colspan="7">'+esc(ri)+' · '+number(list.length)+' Pending Applicants</th></tr><tr><th>S.No.</th><th>Applicant / Owner</th><th>Mobile</th><th>Application No.</th><th>Property UID / House</th><th>Ward</th><th>Call Status / Remark</th></tr></thead><tbody>'+body+'</tbody><tfoot><tr class="total-row"><td colspan="6">'+esc(ri)+' TOTAL</td><td class="center">'+number(list.length)+'</td></tr></tfoot></table>'
}
function exportPendingRIPrint(z,ri,list){
 const snap=fmtDate(payload().snapshot),title=callingFileBase(z,ri);
 const body='<section class="page calling-page single-ri-page">'+cleanHead(z.toUpperCase()+' ZONE · '+S(ri).toUpperCase()+' · PAYMENT PENDING','Volunteer Calling Sheet | '+snap)+'<div class="call-summary"><b>'+number(list.length)+' Pending Approved Applicants</b><span>TS: '+esc(TS[z]||'—')+'</span></div>'+callingRowsHTML(ri,list)+'<div class="footer"><span>नगर निगम आगरा · OTS 2026-27</span><span>'+esc(z)+' Zone · '+esc(ri)+'</span></div></section>';
 reportWindow(title,body,'landscape')
}
function loadExternalScript(src,id){
 return new Promise((resolve,reject)=>{if(document.getElementById(id))return resolve();const s=document.createElement('script');s.id=id;s.src=src;s.onload=resolve;s.onerror=()=>reject(Error('PDF library could not load'));document.head.appendChild(s)})
}
async function ensurePDFDownloadLib(){
 if(window.jspdf?.jsPDF&&window.jspdf.jsPDF.API?.autoTable)return;
 await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','jspdf-lib');
 await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js','jspdf-autotable-lib')
}
async function downloadPendingRIPDF(z,ri,list,button){
 if(!list.length)return;
 const old=button?.textContent;if(button){button.disabled=true;button.textContent='Preparing…'}
 try{
  await ensurePDFDownloadLib();
  const {jsPDF}=window.jspdf,doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const snap=fmtDate(payload().snapshot),file=callingFileBase(z,ri)+'.pdf';
  doc.setTextColor(18,47,69);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text((z+' ZONE · '+ri+' · PAYMENT PENDING').toUpperCase(),148.5,13,{align:'center'});
  doc.setFont('helvetica','normal');doc.setTextColor(70,80,88);doc.setFontSize(9);doc.text('Volunteer Calling Sheet · '+snap+' · '+list.length+' Pending Approved Applicants',148.5,19,{align:'center'});
  const rows=list.map((r,i)=>[String(i+1),S(r.name)||'—',S(r.mobile)||'—',S(r.app)||'—',S(r.uid||r.house)||'—',S(r.ward)||'—','']);
  doc.autoTable({
   startY:24,
   head:[['S.No.','Applicant / Owner','Mobile','Application No.','Property UID / House','Ward','Call Status / Remark']],
   body:rows,
   theme:'grid',
   styles:{font:'helvetica',fontSize:8.5,textColor:[20,24,28],cellPadding:2.2,valign:'middle',lineColor:[170,184,195],lineWidth:.25},
   headStyles:{fillColor:[229,237,246],textColor:[38,55,70],fontStyle:'bold',halign:'center',fontSize:8.2},
   alternateRowStyles:{fillColor:[248,250,252]},
   columnStyles:{0:{cellWidth:12,halign:'center'},1:{cellWidth:42},2:{cellWidth:31,fontStyle:'bold'},3:{cellWidth:48},4:{cellWidth:48},5:{cellWidth:38},6:{cellWidth:45}},
   margin:{left:8,right:8,bottom:10},
   didDrawPage:()=>{doc.setFontSize(7);doc.setTextColor(95,105,114);doc.text('Agra Nagar Nigam · OTS 2026-27 · '+z+' · '+ri,8,203);doc.text('Page '+doc.internal.getNumberOfPages(),289,203,{align:'right'})}
  });
  doc.save(file)
 }catch(e){alert('Direct PDF download could not start. Use Print and choose Save as PDF. '+String(e?.message||e))}
 finally{if(button){button.disabled=false;button.textContent=old}}
}
function exportPendingCallingListPDF(z,rows){
 const snap=fmtDate(payload().snapshot),groups=groupCallingRows(z,rows),grand=rows.length;
 let sections='',first=true;
 for(const [ri,list] of groups){
  sections+='<section class="call-group '+(first?'first-ri':'next-ri')+'"><div class="call-ri"><span>'+esc(ri)+'</span><b>'+number(list.length)+' Pending</b></div>'+callingRowsHTML(ri,list)+'</section>';
  first=false
 }
 const title=S(z)+' - Payment Pending Calling List - '+snap;
 const body='<section class="page calling-page">'+cleanHead(z.toUpperCase()+' ZONE · PAYMENT PENDING CALLING LIST','Volunteer Calling Sheet · RI / TC-wise | '+snap)+'<div class="call-summary"><b>Total Pending Approved Applicants: '+number(grand)+'</b><span>TS: '+esc(TS[z]||'—')+'</span></div>'+sections+'<div class="footer"><span>नगर निगम आगरा · OTS 2026-27</span><span>'+esc(z)+' Zone</span></div></section>';
 reportWindow(title,body,'landscape')
}
function exportZonePDF(z,c,m,ri,wards,o,st){
 const snap=fmtDate(payload().snapshot),todayLabel=fmtDate(payload().snapshot).replace(/\s+\d{4}$/,'')+' Today';
 const summaryRows=[
  ['Applications',number(c.applications)],['Approved',number(c.approved)],['In Process',number(c.inProcess)],
  ['Rejected',number(c.rejected)],['Paid Applicants',number(started(z))],['Unpaid Approved',number(pending(z))],
  ['Total Collection',money(m.total)],[todayLabel,money(m.today)],['Previous Days',money(Math.max(0,m.total-m.today))]
 ];
 const summary='<table class="summary-table compact zone-summary"><tbody>'+summaryRows.map(x=>'<tr><th>'+esc(x[0])+'</th><td>'+esc(x[1])+'</td></tr>').join('')+'</tbody></table>';
 const stages=[['With Applicant',st['With Applicant']],['CTO',st.CTO],['RI',st.RI],['TS',st.TS],['Other / Unallocated',st.Other+(st.gap||0)],['TOTAL IN PROCESS',st.total]];
 const stageTable='<table class="compact zone-stage"><thead><tr><th>Pending Responsibility</th><th>Count</th></tr></thead><tbody>'+stages.slice(0,-1).map(x=>'<tr><td>'+esc(x[0])+'</td><td class="center">'+number(x[1])+'</td></tr>').join('')+'</tbody><tfoot><tr class="total-row"><td>'+esc(stages.at(-1)[0])+'</td><td class="center">'+number(stages.at(-1)[1])+'</td></tr></tfoot></table>';
 const riRows=ri.map(r=>'<tr><td>'+esc(r.ri||'—')+'</td><td class="center">'+number(r.applications)+'</td><td class="center">'+number(r.approved)+'</td><td class="center">'+number(r.inProcess)+'</td><td class="center">'+number(r.paidApplicants)+'</td><td class="num">'+money(r.collection)+'</td></tr>').join('');
 const riTotal='<tr class="total-row"><td>TOTAL</td><td class="center">'+number(ri.reduce((a,r)=>a+N(r.applications),0))+'</td><td class="center">'+number(ri.reduce((a,r)=>a+N(r.approved),0))+'</td><td class="center">'+number(ri.reduce((a,r)=>a+N(r.inProcess),0))+'</td><td class="center">'+number(ri.reduce((a,r)=>a+N(r.paidApplicants),0))+'</td><td class="num">'+money(ri.reduce((a,r)=>a+N(r.collection),0))+'</td></tr>';
 const wardRows=wards.map(r=>'<tr><td class="center">'+esc(r.wardNo??'—')+'</td><td>'+esc(r.ward||'—')+'</td><td>'+esc(r.ri||'—')+'</td><td class="center">'+number(r.applications)+'</td><td class="center">'+number(r.approved)+'</td><td class="center">'+number(r.inProcess)+'</td><td class="num">'+money(r.collection)+'</td></tr>').join('');
 const assigned=wards.reduce((sum,r)=>sum+N(r.collection),0),unassigned=Math.round((m.total-assigned)*100)/100;
 const unassignedRow=Math.abs(unassigned)>0.005?'<tr><td colspan="3">Ward not identified in uploaded reports</td><td colspan="3">—</td><td class="num">'+money(unassigned)+'</td></tr>':'';
 const wardTotal='<tr class="total-row"><td colspan="3">TOTAL (INCLUDING UNASSIGNED)</td><td class="center">'+number(wards.reduce((a,r)=>a+N(r.applications),0))+'</td><td class="center">'+number(wards.reduce((a,r)=>a+N(r.approved),0))+'</td><td class="center">'+number(wards.reduce((a,r)=>a+N(r.inProcess),0))+'</td><td class="num">'+money(m.total)+'</td></tr>';
 const body='<section class="page zone-one-page">'+cleanHead(z.toUpperCase()+' ZONE · OTS DATA','Status, RI / TC and Ward-wise Summary | '+snap)+'<div class="zone-top"><div>'+summary+'</div><div>'+stageTable+'</div></div><div class="section-title">RI / TC Performance</div><table class="compact ri-table"><thead><tr><th>RI / TC</th><th>Applications</th><th>Approved</th><th>In Process</th><th>Paid Applicants</th><th>Collection</th></tr></thead><tbody>'+riRows+'</tbody><tfoot>'+riTotal+'</tfoot></table><div class="section-title ward-title">Ward-wise Position</div><table class="compact ward-table"><thead><tr><th>Ward No.</th><th>Ward</th><th>RI / TC</th><th>Applications</th><th>Approved</th><th>In Process</th><th>Collection</th></tr></thead><tbody>'+wardRows +unassignedRow+'</tbody><tfoot>'+wardTotal+'</tfoot></table><div class="footer"><span>नगर निगम आगरा</span><span>'+esc(z)+' Zone · '+esc(TS[z]||'')+'</span></div></section>';
 reportWindow(z+' OTS Data',body,'portrait')
}
function exportDashboardPDF(){
 const p=payload(),snap=fmtDate(p.snapshot),c=control('All'),m=collection('All'),st=stageStats('All'),todayLabel=fmtDate(p.snapshot).replace(/\s+\d{4}$/,'')+' Today';
 const cityRows=[
  ['Total Applications',number(c.applications)],['Approved',number(c.approved)],['In Process',number(c.inProcess)],['Rejected',number(c.rejected)],
  ['Paid Applicants',number(started('All'))],['Unpaid Approved',number(pending('All'))],['Total Collection',money(m.total)],[todayLabel,money(m.today)],
  ['Previous Days',money(Math.max(0,m.total-m.today))],['Demand',money(c.demand)],['Recovery',pct(m.total,c.demand)]
 ];
 const cityTable='<table class="summary-table compact"><tbody>'+cityRows.map(x=>'<tr><th>'+esc(x[0])+'</th><td>'+esc(x[1])+'</td></tr>').join('')+'</tbody></table>';
 const zrows=ZONES.map(z=>{const zc=control(z),zm=collection(z);return'<tr><td>'+esc(z)+'</td><td>'+esc(TS[z]||'—')+'</td><td class="center">'+number(zc.applications)+'</td><td class="center">'+number(zc.approved)+'</td><td class="center">'+number(zc.inProcess)+'</td><td class="center">'+number(zc.rejected)+'</td><td class="center">'+number(started(z))+'</td><td class="center">'+number(pending(z))+'</td><td class="num">'+money(zm.total)+'</td><td class="num">'+money(zm.today)+'</td><td class="num">'+money(Math.max(0,zm.total-zm.today))+'</td></tr>'}).join('');
 const ztotal='<tr class="total-row"><td>TOTAL</td><td>Agra Nagar Nigam</td><td class="center">'+number(c.applications)+'</td><td class="center">'+number(c.approved)+'</td><td class="center">'+number(c.inProcess)+'</td><td class="center">'+number(c.rejected)+'</td><td class="center">'+number(started('All'))+'</td><td class="center">'+number(pending('All'))+'</td><td class="num">'+money(m.total)+'</td><td class="num">'+money(m.today)+'</td><td class="num">'+money(Math.max(0,m.total-m.today))+'</td></tr>';
 const stages=[['With Applicant',st['With Applicant']],['CTO',st.CTO],['RI',st.RI],['TS',st.TS],['Other / Unallocated',st.Other+(st.gap||0)],['TOTAL IN PROCESS',st.total]];
 const stageTable='<table class="compact"><thead><tr><th>Pending Responsibility</th><th>Count</th></tr></thead><tbody>'+stages.slice(0,-1).map(x=>'<tr><td>'+esc(x[0])+'</td><td class="center">'+number(x[1])+'</td></tr>').join('')+'</tbody><tfoot><tr class="total-row"><td>'+esc(stages.at(-1)[0])+'</td><td class="center">'+number(stages.at(-1)[1])+'</td></tr></tfoot></table>';
 let cum=0;const daily=m.daily.map(r=>{cum+=N(r.amount);return'<tr><td>'+esc(fmtDate(r.date))+'</td><td class="center">'+number(r.receipts)+'</td><td class="num">'+money(r.amount)+'</td><td class="num">'+money(cum)+'</td></tr>'}).join('');
 const page1='<section class="page">'+cleanHead('AGRA NAGAR NIGAM · OTS DATA','Executive Status and Collection Summary | '+snap)+cityTable+'<div class="section-title">Zone-wise Officer Position</div><table class="wide"><thead><tr><th>Zone</th><th>TS</th><th>Applications</th><th>Approved</th><th>In Process</th><th>Rejected</th><th>Paid Applicants</th><th>Unpaid Approved</th><th>Total Collection</th><th>'+esc(todayLabel)+'</th><th>Previous Days</th></tr></thead><tbody>'+zrows+'</tbody><tfoot>'+ztotal+'</tfoot></table><div class="footer"><span>नगर निगम आगरा</span><span>OTS 2026-27</span></div></section>';
 const page2='<section class="page">'+cleanHead('AGRA NAGAR NIGAM · OTS DATA','Pendency and Daily Collection | '+snap)+'<div class="section-title">Pending Responsibility</div>'+stageTable+'<div class="section-title">Daily Collection</div><table class="compact"><thead><tr><th>Date</th><th>Receipts</th><th>Collection</th><th>Cumulative</th></tr></thead><tbody>'+daily+'</tbody><tfoot><tr class="total-row"><td>TOTAL</td><td class="center">'+number(m.receipts)+'</td><td class="num">'+money(m.total)+'</td><td class="num">'+money(m.total)+'</td></tr></tfoot></table><div class="footer"><span>नगर निगम आगरा</span><span>Generated from OTS dashboard</span></div></section>';
 reportWindow('Agra Nagar Nigam OTS Data',page1+page2,'landscape')
}
window.exportDashboardPDF=exportDashboardPDF;
window.exportZoneOfficerTablePDF=exportZoneOfficerTablePDF;

async function showSearch(){const q=L($('prodSearchV8')?.value);if(!q){openModal('Search','Type in the search bar first.','<div class="prod-modal-empty">Search applicant, application, property, ward, RI/TC, cashier or receipt.</div>');return}const D=await detailFor(),apps=(D?.apps||[]).filter(a=>[appNo(a),appName(a),a['Property UID'],a['House / property no.'],zoneOf(a),wardOf(a),riOf(a),mobileOf(a),a['Application status'],a['Pending with']].some(v=>L(v).includes(q))).slice(0,400),pays=(D?.payments||[]).filter(p=>[appNo(p),p['Payer name'],p['Receipt number'],p['Cashier / channel'],p['Property UID'],p['Receipt property no.']].some(v=>L(v).includes(q))).slice(0,400),roster=(PUBLIC.roster||[]).filter(r=>[r.zone,r.wardNo,r.ward,r.ri].some(v=>L(v).includes(q))).slice(0,100),cash=(payload().cashiers||[]).filter(r=>L(r.name||r.cashier).includes(q));let html='';if(apps.length)html+='<h3 class="prod-section-title">Applications</h3>'+table([{key:'app',label:'Application'},{key:'name',label:'Applicant / Owner'},{key:'mobile',label:'Mobile'},{key:'zone',label:'Zone'},{key:'ward',label:'Ward'},{key:'ri',label:'RI / TC'},{key:'status',label:'Status'}],apps.map(a=>({app:esc(appNo(a)),name:esc(appName(a)),mobile:phone(mobileOf(a)),zone:esc(zoneOf(a)||'—'),ward:esc(wardOf(a)||'—'),ri:esc(riOf(a)||'—'),status:esc(a['Application status']||'—')})));if(pays.length)html+='<h3 class="prod-section-title">Receipts / Cashier Matches</h3>'+table([{key:'receipt',label:'Receipt'},{key:'app',label:'Application'},{key:'cashier',label:'Cashier / Channel'},{key:'zone',label:'Zone'},{key:'amount',label:'Amount',num:true}],pays.map(r=>({receipt:esc(r['Receipt number']||'—'),app:esc(appNo(r)||'—'),cashier:esc(r['Cashier / channel']||'Unknown'),zone:esc(r['Property zone']||r['Allocated zone']||'—'),amount:money(r['Amount (INR)'])})));if(cash.length)html+='<h3 class="prod-section-title">Cashier / Channel Summary</h3>'+table([{key:'name',label:'Cashier / Channel'},{key:'receipts',label:'Receipts',num:true},{key:'amount',label:'Collection',num:true}],cash.map(r=>({name:esc(r.name||r.cashier),receipts:number(r.receipts),amount:money(r.amount)})));if(roster.length)html+='<h3 class="prod-section-title">Ward / RI Matches</h3>'+table([{key:'zone',label:'Zone'},{key:'ward',label:'Ward'},{key:'ri',label:'RI / TC'}],roster.map(r=>({zone:esc(r.zone),ward:esc(r.wardNo+' · '+r.ward),ri:esc(r.ri)})));if(!html)html='<div class="prod-modal-empty">No matching record found in the current report.</div>';openModal('Search: '+S($('prodSearchV8').value),'All Zones',html)}
async function loadDates(){const msg=$('prodCalendarMsg');if(msg)msg.textContent='Loading saved report dates…';try{const r=await fetch(LIVE_URL+'?history=1',{cache:'no-store'}),j=await r.json(),dates=j?.dates||[];if(dates.length){const input=$('prodCalendarDate'),sorted=[...dates].sort((a,b)=>S(a.snapshot_date).localeCompare(S(b.snapshot_date)));input.min=sorted[0].snapshot_date;input.max=sorted.at(-1).snapshot_date;input.value=S(payload().snapshot)||sorted.at(-1).snapshot_date;msg.textContent='Saved: '+dates.slice(0,12).map(x=>fmtDate(x.snapshot_date)+(x.is_final?' (Final)':'')).join(' · ')}else msg.textContent='No archived report date yet.'}catch(e){if(msg)msg.textContent='Could not load report history.'}}
async function openDate(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(S(date)))return;const msg=$('prodCalendarMsg');if(msg)msg.textContent='Opening saved report…';try{const r=await fetch(LIVE_URL+'?date='+encodeURIComponent(date),{cache:'no-store'}),j=await r.json(),row=j?.snapshot;if(!row?.payload){msg.textContent='No saved report for this date.';return}state.history=row.payload;state.historyMeta=row;state.historyDetail=await window.OTS_AUTHORITY?.loadDetail?.(date);$('prodCalendarPop').classList.remove('open');render()}catch(e){if(msg)msg.textContent='Could not open saved report.'}}
async function backLive(){state.history=null;state.historyMeta=null;state.historyDetail=null;$('prodCalendarPop')?.classList.remove('open');await window.OTS_AUTHORITY?.restoreDetail?.(S((window.SHARED_LIVE||PUBLIC).snapshot));render()}
function tick(){if(!state.history&&$('prodClockV8'))$('prodClockV8').textContent=clock();if($('prodNextSchedule'))$('prodNextSchedule').textContent=nextSchedule()}
function init(){if(state.ready)return;state.ready=true;ensure();document.addEventListener('click',e=>{const root=e.target.closest?.('#productionDashboard');if(!root)return;const online=e.target.closest('[data-online]'),card=e.target.closest('[data-key]'),stage=e.target.closest('[data-stage]'),metric=e.target.closest('[data-zone-metric]'),zone=e.target.closest('.prod-zone');if(!(online||card||stage||metric||zone))return;e.preventDefault();e.stopImmediatePropagation();if(online)showOnline(online.dataset.online);else if(card)openKey(card.dataset.key);else if(stage){if(stage.dataset.stage==='Total In Process'||stage.dataset.stage==='Zone attribution pending')showApplications('inprocess',stage.dataset.zone);else showStage(stage.dataset.stage,stage.dataset.zone)}else if(metric)showZoneMetric(metric.dataset.zoneMetric,zone?.dataset.zone);else showZone(zone.dataset.zone)},{capture:true});render();setTimeout(()=>releaseInitialLoading(true),45000);setInterval(tick,1000);document.addEventListener('ots:shared-applied',()=>{if(!state.history)render()});document.addEventListener('ots:shared-ready',()=>{if(!state.history)render()});document.addEventListener('ots:detail-ready',()=>{if(!state.history)render()});document.addEventListener('ots:published',()=>{state.history=null;state.historyMeta=null;state.historyDetail=null;render()})}
if(window.__OTS_BOOTSTRAP_READY)init();document.addEventListener('ots:bootstrap-ready',init,{once:true});window.addEventListener('load',()=>setTimeout(()=>{if(!state.ready)init()},300));
})();
