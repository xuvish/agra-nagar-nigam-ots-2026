(function(){
  const originalRenderZones=window.renderZones;
  function paidSet(){
    const s=new Set(); if(!LOCAL)return s;
    for(const p of localResolved().payments){const n=String(p['Application number']||'').trim();if(n)s.add(n)}
    return s;
  }
  function aggregateRIWard(){
    if(!LOCAL)return{ris:[],wards:[]};
    const R=localResolved(), pset=paidSet(), ris={}, wards={};
    const ensure=(map,key,seed)=>map[key]||(map[key]={...seed,applications:0,approved:0,inProcess:0,paidApplicants:0,receipts:0,collection:0,CTO:0,RI:0,TS:0,'With Applicant':0,Other:0});
    for(const a of R.applications){
      const z=a._r.zone,w=a._r.ward,ri=a._r.ri;if(!z||!w||!ri)continue;
      const wr=findWard(z,w), wk=z+'|'+w, rk=z+'|'+ri;
      const W=ensure(wards,wk,{zone:z,ward:w,wardNo:wr?.wardNo??'—',ri}), I=ensure(ris,rk,{zone:z,ri});
      for(const x of [W,I]){x.applications++;if(norm(a['Application status'])==='approved')x.approved++;else{x.inProcess++;let st=stageForPending(a['Pending with']);x[st]=(x[st]||0)+1}if(Number(a['Receipt count']||0)>0||pset.has(String(a['Application number']||'').trim()))x.paidApplicants++}
    }
    for(const p of R.payments){
      const z=p._r.zone,w=p._r.ward,ri=p._r.ri;if(!z||!w||!ri)continue;
      const wr=findWard(z,w),wk=z+'|'+w,rk=z+'|'+ri,amt=Number(p['Amount (INR)']||0);
      const W=ensure(wards,wk,{zone:z,ward:w,wardNo:wr?.wardNo??'—',ri}), I=ensure(ris,rk,{zone:z,ri});
      for(const x of [W,I]){x.receipts++;x.collection+=amt}
    }
    return{ris:Object.values(ris),wards:Object.values(wards)};
  }
  window.renderRIWardPerformance=function(){
    const z=selectedZone(), q=norm($('search').value), box=$('riWardLive');if(!box)return;
    if(!LOCAL){
      box.innerHTML='<div class="notice">Upload the detailed report set to calculate live RI and ward application workflow, paid applicants, receipt count and collection. The locked RI/ward roster above remains visible even before upload.</div>';
      return;
    }
    let {ris,wards}=aggregateRIWard();
    ris=ris.filter(r=>(z==='All'||r.zone===z)&&(!q||[r.zone,r.ri].some(v=>norm(v).includes(q)))).sort((a,b)=>a.zone.localeCompare(b.zone)||a.ri.localeCompare(b.ri));
    wards=wards.filter(r=>(z==='All'||r.zone===z)&&(!q||[r.zone,r.ward,r.ri,r.wardNo].some(v=>norm(v).includes(q)))).sort((a,b)=>a.zone.localeCompare(b.zone)||String(a.wardNo).localeCompare(String(b.wardNo),undefined,{numeric:true}));
    $('riPerfBody').innerHTML=ris.map(r=>`<tr class="clickable"><td>${esc(r.zone)}</td><td><b>${esc(r.ri)}</b></td><td class="num">${num(r.applications)}</td><td class="num">${num(r.approved)}</td><td class="num">${num(r.inProcess)}</td><td class="num">${num(r.paidApplicants)}</td><td class="num">${num(r.receipts)}</td><td class="num">${money(r.collection)}</td><td class="num">${num(r.RI)}</td><td class="num">${num(r.TS)}</td><td class="num">${num(r['With Applicant'])}</td></tr>`).join('')||'<tr><td colspan="11">No RI data in this filter.</td></tr>';
    $('wardPerfBody').innerHTML=wards.map(r=>`<tr class="clickable"><td>${esc(r.zone)}</td><td>${esc(r.wardNo)}</td><td><b>${esc(r.ward)}</b></td><td>${esc(r.ri)}</td><td class="num">${num(r.applications)}</td><td class="num">${num(r.approved)}</td><td class="num">${num(r.inProcess)}</td><td class="num">${num(r.paidApplicants)}</td><td class="num">${num(r.receipts)}</td><td class="num">${money(r.collection)}</td></tr>`).join('')||'<tr><td colspan="10">No ward data in this filter.</td></tr>';
  };
  window.renderZones=function(){originalRenderZones();renderRIWardPerformance()};
  const panel=$('zonesri');
  if(panel&&!$('riWardLive')){
    const block=document.createElement('div');block.id='riWardLive';block.innerHTML='<div class="notice">Preparing RI / Ward intelligence…</div>';
    block.insertAdjacentHTML('beforebegin','<div class="grid2" style="margin-top:12px"><div class="glass"><h3>RI Performance · Workflow + Collection</h3><div class="hint">Applications, approvals, in-process responsibility, known paid applicants, receipts and collection are attributed to the property RI.</div><div class="tablewrap"><table><thead><tr><th>Zone</th><th>RI / TC</th><th class="num">Apps</th><th class="num">Approved</th><th class="num">In Process</th><th class="num">Paid Applicants</th><th class="num">Receipts</th><th class="num">Collection</th><th class="num">RI Pending</th><th class="num">TS Pending</th><th class="num">With Applicant</th></tr></thead><tbody id="riPerfBody"></tbody></table></div></div><div class="glass"><h3>Ward Performance · Workflow + Collection</h3><div class="hint">Every mapped ward rolls into its respected RI and zone. Unmapped wards remain in Needs Classification.</div><div class="tablewrap"><table><thead><tr><th>Zone</th><th>No.</th><th>Ward</th><th>RI / TC</th><th class="num">Apps</th><th class="num">Approved</th><th class="num">In Process</th><th class="num">Paid Applicants</th><th class="num">Receipts</th><th class="num">Collection</th></tr></thead><tbody id="wardPerfBody"></tbody></table></div></div></div>');
    panel.appendChild(block);
  }
  renderZones();
})();
