(function(){
  const originalCurrentControl = window.currentControl;
  const originalRenderKPIs = window.renderKPIs;

  function appNumber(r){ return String(r['Application number']||'').trim(); }
  function appMobile(a){
    const keys=['Mobile','Mobile No','Mobile No.','Mobile Number','Applicant Mobile','Applicant Mobile No','Contact','Contact No','Contact Number','Phone','Phone No'];
    for(const k of keys){ if(a[k]!==undefined && a[k]!==null && String(a[k]).trim()) return String(a[k]).trim(); }
    return '—';
  }
  function paidAppSet(zone){
    if(!LOCAL) return new Set();
    const set=new Set();
    const R=localResolved();
    for(const p of R.payments){
      const n=appNumber(p); if(!n) continue;
      if(zone!=='All' && p._r.zone!==zone) continue;
      set.add(n);
    }
    return set;
  }
  function appsFor(zone){
    if(!LOCAL) return [];
    return localResolved().applications.filter(a=>zone==='All'||a._r.zone===zone);
  }
  function isPaidApplicant(a,paidSet){
    return Number(a['Receipt count']||0)>0 || paidSet.has(appNumber(a));
  }

  window.currentControl=function(zone){
    if(!LOCAL) return originalCurrentControl(zone);
    const base=zoneControl(zone), cm=getCollectionMetrics(zone), apps=appsFor(zone), pset=paidAppSet(zone);
    const approved=apps.filter(a=>norm(a['Application status'])==='approved').length;
    const inProcess=apps.filter(a=>norm(a['Application status'])!=='approved').length;
    const payingApps=apps.filter(a=>norm(a['Application status'])==='approved'&&isPaidApplicant(a,pset)).length;
    return {...base,applications:apps.length,approved,inProcess,payingApps,collection:cm.total};
  };

  window.renderKPIs=function(){
    originalRenderKPIs();
    document.querySelectorAll('.kpi .lab').forEach(el=>{
      if(el.textContent.trim()==='Known Paying Apps') el.textContent='Known Paid Applicants';
    });
  };

  window.renderFollowup=function(){
    const z=selectedZone(), c=currentControl(z), publicUnpaid=Math.max(0,Number(c.approved||0)-Number(c.payingApps||0));
    if(!LOCAL){
      $('followHint').innerHTML=`<b>${num(publicUnpaid)}</b> approved applicants have no known payment in this ${z==='All'?'citywide':'zone'} control view. Upload the detailed report set to reveal the private calling list.`;
      $('followBody').innerHTML=`<tr><td colspan="10" style="text-align:center;padding:28px;color:#6f8ca0">Private applicant details are not embedded in public GitHub. Upload reports locally to generate this list.</td></tr>`;
      window.__followRows=[];
      return;
    }
    const q=norm($('search').value), pset=paidAppSet(z);
    const rows=appsFor(z)
      .filter(a=>norm(a['Application status'])==='approved'&&!isPaidApplicant(a,pset))
      .filter(a=>!q||[a['Application number'],a['Applicant / owner'],a['Property UID'],a['House / property no.'],appMobile(a),a._r.zone,a._r.ward,a._r.ri].some(v=>norm(v).includes(q)));
    window.__followRows=rows;
    $('followHint').innerHTML=`<b>${num(rows.length)}</b> approved applicants have no recorded receipt in this ${z==='All'?'citywide':'zone'} view. These are the volunteer calling targets. <b>${num(c.payingApps)}</b> approved applicants are already payment-linked.`;
    $('followBody').innerHTML=rows.slice(0,2000).map(a=>`<tr><td>${esc(a['Application number']||'—')}</td><td>${esc(a['Applicant / owner']||'—')}</td><td>${esc(appMobile(a))}</td><td>${esc(a['Property UID']||'—')}</td><td>${esc(a['House / property no.']||'—')}</td><td>${esc(a._r.zone||'Needs classification')}</td><td>${esc(a._r.ward||'—')}</td><td>${esc(a._r.ri||'—')}</td><td>${esc(a['Approval date']||a['Status date']||'—')}</td><td><span class="badge gold">PAYMENT PENDING</span></td></tr>`).join('') || `<tr><td colspan="10" style="text-align:center;padding:28px;color:#7ca0b4">No approved unpaid applicant in this filter.</td></tr>`;
  };

  window.printFollowup=function(){
    const rows=window.__followRows||[], z=selectedZone();
    if(!LOCAL){ alert('Upload the detailed reports first to print the applicant calling list.'); return; }
    const w=window.open('','_blank','width=1200,height=800');
    if(!w){ alert('Please allow pop-ups once for printing.'); return; }
    const trs=rows.map((a,i)=>`<tr><td>${i+1}</td><td>${esc(a['Application number']||'—')}</td><td>${esc(a['Applicant / owner']||'—')}</td><td>${esc(appMobile(a))}</td><td>${esc(a['Property UID']||'—')}</td><td>${esc(a['House / property no.']||'—')}</td><td>${esc(a._r.zone||'Needs classification')}</td><td>${esc(a._r.ward||'—')}</td><td>${esc(a._r.ri||'—')}</td><td>${esc(a['Approval date']||a['Status date']||'—')}</td></tr>`).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>OTS Approved Unpaid Applicants - ${esc(z)}</title><style>body{font:12px Arial;padding:22px;color:#111}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 14px;color:#444}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:6px;text-align:left;font-size:10px}th{background:#eee}.meta{display:flex;justify-content:space-between;margin-bottom:10px;font-size:11px}@media print{body{padding:0}thead{display:table-header-group}}</style></head><body><h1>Agra Nagar Nigam · OTS 2026-27</h1><p>Approved Applicants · Payment Pending · ${esc(z==='All'?'All Zones':z)}</p><div class="meta"><span>Total: <b>${rows.length}</b></span><span>Generated: ${new Date().toLocaleString('en-IN')}</span></div><table><thead><tr><th>#</th><th>Application</th><th>Applicant / Owner</th><th>Mobile</th><th>Property UID</th><th>House No.</th><th>Zone</th><th>Ward</th><th>RI / TC</th><th>Approved On</th></tr></thead><tbody>${trs}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
    w.document.close();
  };

  const zoneHead=document.querySelector('#zonesri thead tr');
  if(zoneHead){ [...zoneHead.children].forEach(th=>{ if(th.textContent.trim()==='Known Paid') th.textContent='Known Paid Applicants'; }); }
  const followTableHead=document.querySelector('#followup thead tr');
  if(followTableHead){
    followTableHead.innerHTML='<th>Application</th><th>Applicant / Owner</th><th>Mobile</th><th>Property UID</th><th>House No.</th><th>Zone</th><th>Ward</th><th>RI</th><th>Approved On</th><th>Status</th>';
  }
  const followGlass=document.querySelector('#followup .glass');
  if(followGlass && !document.getElementById('printFollowBtn')){
    const top=document.createElement('div'); top.style.cssText='display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap';
    const h=followGlass.querySelector('h3'); const hint=followGlass.querySelector('.hint');
    if(h&&hint){ const holder=document.createElement('div'); h.parentNode.insertBefore(holder,h); holder.appendChild(h); holder.appendChild(hint); top.appendChild(holder); const b=document.createElement('button'); b.id='printFollowBtn'; b.className='btn gold'; b.textContent='Print Calling List'; b.onclick=printFollowup; top.appendChild(b); followGlass.insertBefore(top, followGlass.firstChild); }
  }
  renderAll();
})();
(function(){const s=document.createElement('script');s.src='assets/fix-point2.js?v=20260917-0815';s.onload=()=>{if(window.renderAll)renderAll()};document.body.appendChild(s)})();
