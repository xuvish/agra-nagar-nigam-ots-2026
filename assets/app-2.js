function renderOverview(){
  let z=getZone(), latest=latestDate();
  let ps=filterPayments(z);
  let byDate={};for(const r of ps){let d=String(r['Payment date']).slice(0,10);byDate[d]=(byDate[d]||0)+Number(r['Amount (INR)']||0)}
  let dates=Object.keys(byDate).sort(), max=Math.max(...Object.values(byDate),1);
  $('dailyBars').innerHTML=dates.slice(-14).map(d=>`<div class="barrow"><span>${fmtDate(d).replace(' 2026','')}</span><div class="track"><div class="fill" style="width:${Math.max(1,byDate[d]/max*100)}%"></div></div><b class="num">${INR(byDate[d])}</b></div>`).join('')||'<div class="hint">No payments in this filter.</div>';
  let byC={};for(const r of ps){let c=r['Cashier / channel']||'Unresolved';byC[c]=(byC[c]||0)+Number(r['Amount (INR)']||0)}
  let crows=Object.entries(byC).sort((a,b)=>b[1]-a[1]);let cm=Math.max(...crows.map(x=>x[1]),1);
  $('cashierBars').innerHTML=crows.map(([c,a])=>`<div class="barrow"><span>${escapeHtml(c)}</span><div class="track"><div class="fill" style="width:${a/cm*100}%"></div></div><b class="num">${INR(a)}</b></div>`).join('');
  let apps=currentApps().filter(a=>norm(a['Application status'])==='in progress');
  let pmap={};for(const a of apps){let h=a['Pending with']||'Not specified';pmap[h]=(pmap[h]||0)+1}
  $('pendingBreakdown').innerHTML=Object.entries(pmap).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #edf1f4"><span>${escapeHtml(k)}</span><b>${NUM(v)}</b></div>`).join('')||'<div class="hint">No in-process rows in this filter.</div>';
  let tsRows=(DATA.tsApprovals||[]).filter(x=>z==='All'||x.zone===z||((z==='Tajganj'||z==='Lohamandi')&&x.zone==='Tajganj + Lohamandi'));
  $('tsBreakdown').innerHTML=tsRows.map(x=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #edf1f4"><span><b>${escapeHtml(x.name)}</b><br><small style="color:#7b8996">${escapeHtml(x.zone)}</small></span><b>${NUM(x.count)}</b></div>`).join('')||'<div class="hint">No TS approval split available for this filter.</div>'
}
function renderZones(){
  let z=getZone();
  let zoneNames=['Chhatta','Hariparwat','Tajganj','Lohamandi','Tajganj / Lohamandi','Unresolved'];
  let rows=zoneNames.map(name=>DATA.zones.find(r=>r['Zone / RI']===name)).filter(Boolean);
  if(z!=='All')rows=rows.filter(r=>r['Zone / RI']===z||(z==='Tajganj'||z==='Lohamandi')&&r['Zone / RI']==='Tajganj / Lohamandi');
  let html=rows.filter(r=>qmatch(r['Zone / RI'],zoneTS(r['Zone / RI']))).map(r=>`<tr><td><b>${escapeHtml(r['Zone / RI'])}</b></td><td>${escapeHtml(zoneTS(r['Zone / RI']))}</td><td class="num">${NUM(r.Applications)}</td><td class="num">${NUM(r.Approved)}</td><td class="num">${NUM(r['In process'])}</td><td class="num">${INR(r['Summary received'])}</td><td class="num">${INR(r['Receipt collection'])}</td><td class="num">${INR(r['Demand generated'])}</td></tr>`).join('');
  let wards=filteredWards(false), by={};
  for(const w of wards){let ri=w['RI / TC'];if(!ri||ri==='Unresolved')continue; if(!by[ri])by[ri]={apps:0,app:0,ip:0,sum:0,rc:0,dem:0,zone:w.Zone};by[ri].apps+=+w.Applications||0;by[ri].app+=+w.Approved||0;by[ri].ip+=+w['In process']||0;by[ri].sum+=+w['Summary received']||0;by[ri].rc+=+w['Receipt collection']||0;by[ri].dem+=+w['Demand generated']||0}
  html+=Object.entries(by).sort((a,b)=>a[0].localeCompare(b[0])).filter(([ri,v])=>qmatch(ri,v.zone)).map(([ri,v])=>`<tr><td style="padding-left:24px">${escapeHtml(ri)} <span class="badge">${escapeHtml(v.zone)}</span></td><td>—</td><td class="num">${NUM(v.apps)}</td><td class="num">${NUM(v.app)}</td><td class="num">${NUM(v.ip)}</td><td class="num">${INR(v.sum)}</td><td class="num">${INR(v.rc)}</td><td class="num">${INR(v.dem)}</td></tr>`).join('');
  $('zoneBody').innerHTML=html
}
function filteredWards(applySearch=true){
  let z=getZone(),ri=$('ri').value;
  return DATA.wards.filter(w=>w.Ward&&w.Ward!=='CITY TOTAL').filter(w=>z==='All'||w.Zone===z).filter(w=>ri==='All'||w['RI / TC']===ri).filter(w=>!applySearch||qmatch(w.Zone,w['Roster no.'],w.Ward,w['RI / TC']))
}
function renderWards(){
  $('wardBody').innerHTML=filteredWards().map(w=>`<tr><td>${escapeHtml(w.Zone||'')}</td><td>${escapeHtml(w['Roster no.']??'')}</td><td><b>${escapeHtml(w.Ward||'')}</b></td><td>${escapeHtml(w['RI / TC']||'')}</td><td class="num">${NUM(w.Applications)}</td><td class="num">${NUM(w.Approved)}</td><td class="num">${NUM(w['In process'])}</td><td class="num">${INR(w['Summary received'])}</td><td class="num">${INR(w['Receipt collection'])}</td></tr>`).join('')
}
