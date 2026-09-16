function currentPayments(){
  let z=getZone(),ri=$('ri').value,c=$('cashier').value;
  return DATA.payments.filter(r=>z==='All'||(r['Allocated zone']||'Unresolved')===z).filter(r=>ri==='All'||r['Allocated RI / TC']===ri).filter(r=>c==='All'||r['Cashier / channel']===c).filter(r=>qmatch(r['Application number'],r['Payer name'],r['Receipt property no.'],r['Receipt number'],r['Cashier / channel'],r['Allocated zone'],r['Allocated ward'],r['Allocated RI / TC']))
}
function renderCashiers(){
  let ps=currentPayments(), total=moneySum(ps), by={};
  for(const r of ps){let c=r['Cashier / channel']||'Unresolved';if(!by[c])by[c]={n:0,a:0};by[c].n++;by[c].a+=Number(r['Amount (INR)']||0)}
  $('cashierBody').innerHTML=Object.entries(by).sort((a,b)=>b[1].a-a[1].a).map(([c,v])=>`<tr><td><b>${escapeHtml(c)}</b></td><td class="num">${NUM(v.n)}</td><td class="num">${INR(v.a)}</td><td class="num">${total?(v.a/total*100).toFixed(1):'0.0'}%</td></tr>`).join('')
}
function currentApps(){
  let z=getZone(),ri=$('ri').value;
  return DATA.applications.filter(r=>z==='All'||(r['Allocated zone']||'Unresolved')===z).filter(r=>ri==='All'||r['Allocated RI / TC']===ri).filter(r=>qmatch(r['Application number'],r['Property UID'],r['Applicant / owner'],r['House / property no.'],r['Application status'],r['Allocated zone'],r['Allocated ward'],r['Allocated RI / TC'],r['Cashier / channel'],r['TS approver']))
}
function renderApplications(){
  let rows=currentApps();$('appHint').textContent=`${NUM(rows.length)} matching application rows. Showing first 1,500 rows.`;
  $('appBody').innerHTML=rows.slice(0,1500).map(r=>`<tr><td>${escapeHtml(r['Application number']||'')}</td><td>${escapeHtml(r['Applicant / owner']||'')}</td><td>${escapeHtml(r['Property UID']||'')}</td><td>${escapeHtml(r['House / property no.']||'')}</td><td>${escapeHtml(r['Application status']||'')}</td><td>${escapeHtml(r['Allocated zone']||'Unresolved')}</td><td>${escapeHtml(r['Allocated ward']||'Unresolved')}</td><td>${escapeHtml(r['Allocated RI / TC']||'Unresolved')}</td><td class="num">${INR(r['Paid amount (INR)'])}</td><td>${escapeHtml(r['TS approver']||'')}</td></tr>`).join('')
}
function renderPayments(){
  let rows=currentPayments().slice().sort((a,b)=>String(b['Payment date']).localeCompare(String(a['Payment date'])));
  $('payHint').textContent=`${NUM(rows.length)} matching receipts · ${INR(moneySum(rows))}.`;
  $('payBody').innerHTML=rows.slice(0,1500).map(r=>`<tr><td>${fmtDate(r['Payment date'])}</td><td>${escapeHtml(r['Receipt number']||'')}</td><td>${escapeHtml(r['Application number']||'')}</td><td>${escapeHtml(r['Payer name']||'')}</td><td>${escapeHtml(r['Cashier / channel']||'')}</td><td>${escapeHtml(r['Allocated zone']||'Unresolved')}</td><td>${escapeHtml(r['Allocated ward']||'Unresolved')}</td><td>${escapeHtml(r['Allocated RI / TC']||'Unresolved')}</td><td class="num">${INR(r['Amount (INR)'])}</td></tr>`).join('')
}
function renderQuality(){
  let apps=DATA.applications, approved=apps.filter(r=>norm(r['Application status'])==='approved'), receipts=DATA.payments, amount=moneySum(receipts), city=cityControl();
  $('aApps').textContent=NUM(apps.length);$('aApproved').textContent=NUM(approved.length);$('aReceipts').textContent=NUM(receipts.length);$('aAmount').textContent=INR(amount);
  let issues=[];
  issues.push(checkLine('Application rows vs city control',apps.length,Number(city?.Applications||0)));
  issues.push(checkLine('Approved rows vs city control',approved.length,Number(city?.Approved||0)));
  let uniquePaidApps=new Set(receipts.map(r=>String(r['Application number']??'').trim()).filter(Boolean)).size;issues.push(checkLine('Unique paying applications vs city control',uniquePaidApps,Number(city?.['Paying applications']||0)));
  issues.push(checkLine('Receipt amount vs city receipt collection',amount,Number(city?.['Receipt collection']||0),true));
  let joint=moneySum(receipts.filter(r=>r['Allocated zone']==='Tajganj / Lohamandi')), unr=moneySum(receipts.filter(r=>(r['Allocated zone']||'Unresolved')==='Unresolved'));
  issues.push(`<div class="notice" style="margin-top:9px">Tajganj / Lohamandi joint allocation: <b>${INR(joint)}</b>. Unresolved zone allocation: <b>${INR(unr)}</b>. These are deliberately not guessed into individual zones.</div>`);
  let byDate={};for(const r of receipts){let d=String(r['Payment date']||'').slice(0,10);byDate[d]=(byDate[d]||0)+Number(r['Amount (INR)']||0)}
  let dailyRecalc=Object.values(byDate).reduce((a,b)=>a+b,0);issues.push(checkLine('Daily totals vs receipt register',dailyRecalc,amount,true));
  let byCash={};for(const r of receipts){let c=r['Cashier / channel']||'Unresolved';byCash[c]=(byCash[c]||0)+Number(r['Amount (INR)']||0)}
  let cashierRecalc=Object.values(byCash).reduce((a,b)=>a+b,0);issues.push(checkLine('Cashier totals vs receipt register',cashierRecalc,amount,true));
  let zoneRecalc={};for(const r of receipts){let z=r['Allocated zone']||'Unresolved';zoneRecalc[z]=(zoneRecalc[z]||0)+Number(r['Amount (INR)']||0)}
  let zoneTotal=Object.values(zoneRecalc).reduce((a,b)=>a+b,0);issues.push(checkLine('Zone allocation totals vs receipt register',zoneTotal,amount,true));
  let controlNames=['Chhatta','Hariparwat','Tajganj','Lohamandi','Unresolved'], controlRows=controlNames.map(n=>DATA.zones.find(r=>r['Zone / RI']===n)).filter(Boolean);
  let appControlSum=controlRows.reduce((s,r)=>s+Number(r.Applications||0),0);issues.push(checkLine('Zone application controls vs city applications',appControlSum,Number(city?.Applications||0)));
  let paymentControlNames=['Chhatta','Hariparwat','Tajganj','Lohamandi','Tajganj / Lohamandi','Unresolved'], paymentControlRows=paymentControlNames.map(n=>DATA.zones.find(r=>r['Zone / RI']===n)).filter(Boolean);
  let paidControlSum=paymentControlRows.reduce((s,r)=>s+Number(r['Paying applications']||0),0);issues.push(checkLine('Zone paying-app controls vs city paying apps',paidControlSum,Number(city?.['Paying applications']||0)));
  let zoneReceiptControl=paymentControlRows.reduce((s,r)=>s+Number(r['Receipt collection']||0),0);issues.push(checkLine('Zone receipt controls vs city receipt collection',zoneReceiptControl,Number(city?.['Receipt collection']||0),true));
  $('auditNotes').innerHTML=issues.join('');
  let latest=latestDate(), first=receipts.map(r=>String(r['Payment date']||'').slice(0,10)).filter(Boolean).sort()[0]||'—';
  $('sourceManifest').innerHTML=`<b>Source:</b> ${escapeHtml(DATA.meta.source||'Verified embedded master')}<br><b>Snapshot:</b> ${fmtDate(DATA.meta.snapshot)}<br><b>Collection coverage:</b> ${fmtDate(first)} to ${fmtDate(latest)}<br><b>Applications:</b> ${NUM(apps.length)} rows · <b>Paying applications:</b> ${NUM(uniquePaidApps)} · <b>Receipt transactions:</b> ${NUM(receipts.length)}`
}
function checkLine(label,a,b,money=false){let ok=Math.abs(a-b)<0.01;return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #edf1f4"><span>${escapeHtml(label)}</span><b class="${ok?'good':'bad'}">${ok?'MATCH':'MISMATCH'} · ${money?INR(a):NUM(a)} / ${money?INR(b):NUM(b)}</b></div>`}
function renderAll(){renderKPIs();renderOverview();renderZones();renderWards();renderCashiers();renderApplications();renderPayments();renderQuality()}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
