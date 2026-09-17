(function(){
  const OLD_RENDER_WORKFLOW = window.renderWorkflow;

  const N=s=>String(s??'').trim();
  const NN=s=>N(s).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const numv=v=>{const n=Number(String(v??0).replace(/,/g,''));return Number.isFinite(n)?n:0};
  const appKey=r=>N(r?.['Application number']||r?.AppNo||r?.['Application No']||r?.['Application No.']);

  const WARD_ALIASES={
    'noori darwaja':'nuri darwaja','nuri darwaza':'nuri darwaja','nuri darwaja':'nuri darwaja',
    'namner':'naam ner','naamner':'naam ner','naam ner':'naam ner',
    'gover chauki':'gover chawki','gover chowki':'gover chawki','gover chawki':'gover chawki',
    'harjupura':'harjjupura','harju pura':'harjjupura','harjjupura':'harjjupura',
    'mustafa quarter':'mustfa quater','mustfa quarter':'mustfa quater','mustfa quater':'mustfa quater',
    'awas vikas pachimi':'avas vikas west','avas vikas pachimi':'avas vikas west','awas vikas west':'avas vikas west','avas vikas west':'avas vikas west',
    'awas vikas pashchimi':'avas vikas west','avas vikas pashchimi':'avas vikas west',
    'avas vikas south':'avas vikas south','awas vikas south':'avas vikas south',
    'nagala ajeeta':'nagla ajeeta','nagla ajita':'nagla ajeeta','nagla ajeeta':'nagla ajeeta',
    'ghadi bhadauria':'gadhi bhadauriya','ghari bhadauria':'gadhi bhadauriya','gadhi bhadauriya':'gadhi bhadauriya',
    'rajamandi':'raja mandi','raja mandi':'raja mandi',
    'khati pada':'khati para','khatipada':'khati para','khati para':'khati para',
    'azam pada':'ajampada','ajam pada':'ajampada','ajampada':'ajampada',
    'bagh farzana':'bagh farjana','bagh farjana':'bagh farjana',
    'ghatia ajam khan':'ghatiya ajam khan','ghatiya azam khan':'ghatiya ajam khan',
    'nagla harmukh':'nagala harmukh','nagala harmukh':'nagala harmukh',
    'jagdishpura east':'jagdish pura east','jagdish pura east':'jagdish pura east',
    'jagdishpura west':'jagdish pura west','jagdish pura west':'jagdish pura west',
    'mah rishi puram':'mahrishi puram','maharishi puram':'mahrishi puram','mahrishi puram':'mahrishi puram',
    'nawalnawal ganj':'nawal ganj','nawal ganj':'nawal ganj',
    'seeta nagar':'seeta nagar','sita nagar':'seeta nagar',
    'katra fulail':'katra fulail','katra fulel':'katra fulail',
    'dhandhu pura':'dhandhoo pura','dhandhoo pura':'dhandhoo pura',
    'ukhrrra':'ukhrra','ukhrra':'ukhrra',
    'khuwash pura':'khuwash pura','khwaspura':'khuwash pura',
    'sar labagh':'sarlabagh','sarla bagh':'sarlabagh','sarlabagh':'sarlabagh',
    'gummat takht pehlwan':'gummat takht pahlwan','gummat takht pahlwan':'gummat takht pahlwan',
    'tal firoz khan':'tal firoj khan','tal firoj khan':'tal firoj khan',
    'raj nagar':'raj nagar','ram mohan nagar':'ram mohan nagar','rahul nagar bodla':'rahul nagar bodla'
  };

  function canonicalZone(raw){
    const s=NN(raw).replace(/\bzone\b/g,'').trim();
    if(/chhat|chatta|chhata/.test(s))return'Chhatta';
    if(/hari\s*par|haripar/.test(s))return'Hariparwat';
    if(/taj\s*ganj|tajganj/.test(s))return'Tajganj';
    if(/loha\s*mandi|lohamandi/.test(s))return'Lohamandi';
    return null;
  }
  function wardNorm(raw){
    let s=NN(raw).replace(/^w\s+/,'').replace(/^ward\s+/,'').replace(/\bzone\b/g,'').trim();
    s=s.replace(/^\d+\s*[-,/]*\s*/,'').trim();
    return WARD_ALIASES[s]||s;
  }
  function wardNumber(raw){const m=N(raw).match(/^\s*(\d{1,3})(?:\s|[-,\/]|$)/);return m?Number(m[1]):null}
  function rosterRows(){return PUBLIC.roster||[]}
  function canonicalWard(raw,zoneHint){
    if(!raw)return null;
    const no=wardNumber(raw), z=canonicalZone(zoneHint)||zoneHint;
    if(no!=null){
      let c=rosterRows().filter(r=>Number(r.wardNo)===no && (!z||r.zone===z));
      if(c.length===1)return c[0];
      c=rosterRows().filter(r=>Number(r.wardNo)===no); if(c.length===1)return c[0];
    }
    const q=wardNorm(raw); if(!q)return null;
    let c=rosterRows().filter(r=>(!z||r.zone===z) && wardNorm(r.ward)===q);if(c.length===1)return c[0];
    c=rosterRows().filter(r=>wardNorm(r.ward)===q);if(c.length===1)return c[0];
    c=rosterRows().filter(r=>(!z||r.zone===z) && (wardNorm(r.ward).includes(q)||q.includes(wardNorm(r.ward))));if(c.length===1)return c[0];
    c=rosterRows().filter(r=>wardNorm(r.ward).includes(q)||q.includes(wardNorm(r.ward)));if(c.length===1)return c[0];
    return null;
  }

  window.resolveRecord=function(r,isPayment=false){
    const key=mappingKey(r), saved=MANUAL[key];
    if(saved){const wr=canonicalWard(saved.ward,saved.zone);return{zone:saved.zone,ward:wr?.ward||saved.ward,ri:wr?.ri||saved.ri||null,basis:'Manual mapping'}}
    let z=canonicalZone(r['Allocated zone']||r['Actual property zone']||r['ZoneName']);
    let wraw=r['Allocated ward']||r['Actual property ward']||r['WardName'];
    const wr=canonicalWard(wraw,z);
    if(wr)return{zone:wr.zone,ward:wr.ward,ri:wr.ri,basis:r['Allocation basis']||'Ward master'};
    if(z)return{zone:z,ward:wraw?N(wraw):null,ri:N(r['Allocated RI / TC'])||null,basis:'Zone known · ward/RI pending'};
    return{zone:null,ward:null,ri:null,basis:'Needs classification'};
  };

  function rows2d(wb,sh){return XLSX.utils.sheet_to_json(wb.Sheets[sh],{header:1,defval:null,raw:true})}
  function rowObjects(a,headerIndex){
    const h=a[headerIndex].map(x=>N(x));
    return a.slice(headerIndex+1).filter(r=>r.some(v=>v!==null&&N(v)!=='')).map(r=>Object.fromEntries(h.map((k,i)=>[k||`__${i}`,r[i]])));
  }
  function findHeader(a,need){
    for(let i=0;i<Math.min(a.length,30);i++){const n=a[i].map(NN);if(need.every(x=>n.some(v=>v===NN(x)||v.includes(NN(x)))))return i}return-1;
  }
  function firstSheetWith(wb,need){for(const sh of wb.SheetNames){const a=rows2d(wb,sh),i=findHeader(a,need);if(i>=0)return{sh,a,i}}return null}

  function parseApplicationsWB(wb){
    const hit=firstSheetWith(wb,['AppNo','Status']);if(!hit)return[];
    return rowObjects(hit.a,hit.i).map(r=>({
      'Application number':N(r.AppNo||r['Application No']||r['Application No.']),
      'Applicant / owner':N(r.AppName||r['Name Of Applicant']||r.Name),
      'Property UID':N(r.Property_UID||r['Property UID']),
      'House / property no.':N(r.PropertyNo||r['Property No.']),
      'Application status':N(r.Status),
      'Status date':toDate(r.AppStatusDate),
      '_appId':r.AppID
    })).filter(r=>r['Application number']);
  }
  function parsePaymentMasterWB(wb,state){
    const hit=firstSheetWith(wb,['AppNo','ZoneName','WardName','TotalPaid']);if(!hit)return[];
    return rowObjects(hit.a,hit.i).map(r=>({
      app:N(r.AppNo),'Property UID':N(r.Property_UID),'Applicant / owner':N(r.AppName),'House / property no.':N(r.PropertyNo),
      zoneRaw:N(r.ZoneName),wardRaw:N(r.WardName),reference:N(r.ReferenceNos),date:toDate(r.CreatedDate),amount:numv(r.TotalPaid),mode:N(r.PaymentMode),state
    })).filter(r=>r.app);
  }
  function parseApprovedWB(wb){
    const hit=firstSheetWith(wb,['Application No','Application Approved On','Approved By']);if(!hit)return[];
    return rowObjects(hit.a,hit.i).map(r=>({app:N(r['Application No']||r['Application No.']),'Applicant / owner':N(r['Name Of Applicant']),'Approval date':toDate(r['Application Approved On']),'Received date':toDate(r['Application Received On']),'TS approver':N(r['Approved By']),'Latest remark':N(r['Last Remark'])})).filter(r=>r.app);
  }
  function parseInProcessWB(wb){
    const hit=firstSheetWith(wb,['Application No','Pending with whom']);if(!hit)return[];
    return rowObjects(hit.a,hit.i).map(r=>({app:N(r['Application No']||r['Application No.']),'Applicant / owner':N(r['Name of Applicant']),'Received date':toDate(r['Application Received On']),'Pending with':N(r['Pending with whom']),'Pending days':numv(r['For How Many Days']),'Latest remark':N(r['Last Remark'])})).filter(r=>r.app);
  }
  function parseCollectionWB(wb){
    const hit=firstSheetWith(wb,['Application No.','Receipt No.','Total Amount']);if(!hit)return[];
    return rowObjects(hit.a,hit.i).map(r=>({app:N(r['Application No.']||r['Application No']),name:N(r.Name),property:N(r['Property No.']),mobile:N(r['Mobile No.']),receipt:N(r['Receipt No.']),date:toDate(r['Payment Date']),amount:numv(r['Total Amount']),cashier:N(r['CashWindow Name']),sourceZone:N(r['Zone Name']),sourceWard:N(r['Ward Name']),mode:N(r.Mode||r['Payment Mode'])})).filter(r=>r.app&&r.receipt&&r.date);
  }
  function parseWardSummaryWB(wb){
    let out=[];
    for(const sh of wb.SheetNames){const a=rows2d(wb,sh);let hi=-1;for(let i=0;i<Math.min(a.length,30);i++){const r=a[i].map(NN);if(r.some(x=>x.includes('appl received'))&&r.some(x=>x.includes('approved'))){hi=i;break}}if(hi<0)continue;
      let start=hi+1;if(a[start]&&a[start].map(NN).some(x=>x==='in time'||x==='applicant'))start++;
      for(let i=start;i<a.length;i++){
        const r=a[i]; if(!r)continue; const first=NN(r[0]), second=NN(r[1]);
        if(second==='total'||first==='total')break;
        const apps=numv(r[4]); if(!apps&&!N(r[2])&&!N(r[3]))continue;
        const zoneRaw=N(r[2]),wardRaw=N(r[3]),inTime=numv(r[5]),overdue=numv(r[6]),applicant=numv(r[7]),approved=numv(r[8]),rejected=numv(r[9]),received=numv(r[10]),demand=numv(r[11]);
        const wr=canonicalWard(wardRaw,zoneRaw), zone=wr?.zone||canonicalZone(zoneRaw);
        out.push({zoneRaw,wardRaw,zone,wr,applications:apps,inTime,overdue,applicant,approved,rejected,inProcess:inTime+overdue+applicant,received,demand});
      }
    }
    return out;
  }
  function dedupe(arr,key){const m=new Map();for(const x of arr){const k=key(x);if(k)m.set(k,{...(m.get(k)||{}),...x})}return[...m.values()]}

  function aggregateControls(apps,wardRows,paymentMaster,receipts){
    const city={applications:apps.length,approved:0,inProcess:0,rejected:0,demand:0,payingApps:0,collection:0,unresolvedWard:0};
    for(const a of apps){const s=NN(a['Application status']);if(s==='approved')city.approved++;else if(s.includes('reject'))city.rejected++;else city.inProcess++}
    city.demand=wardRows.reduce((s,r)=>s+r.demand,0);
    const zones={};for(const z of ZONES)zones[z]={applications:0,approved:0,inProcess:0,rejected:0,demand:0,payingApps:0,collection:0,unresolvedWard:0,applicantPending:0};
    let unclassifiedApps={applications:0,approved:0,inProcess:0,rejected:0,demand:0};
    for(const r of wardRows){const t=r.zone?zones[r.zone]:unclassifiedApps;for(const k of ['applications','approved','inProcess','rejected','demand'])t[k]+=r[k]||0;if(r.zone)zones[r.zone].applicantPending+=r.applicant||0}
    const payAppMap=new Map();for(const p of paymentMaster){const wr=canonicalWard(p.wardRaw,p.zoneRaw),z=wr?.zone||canonicalZone(p.zoneRaw);payAppMap.set(p.app,{...p,zone:z,wr})}
    const paidByZone={};for(const z of ZONES)paidByZone[z]=new Set();
    for(const [app,p] of payAppMap){if(p.zone)paidByZone[p.zone].add(app)}
    city.payingApps=payAppMap.size;for(const z of ZONES)zones[z].payingApps=paidByZone[z].size;
    for(const r of receipts){const pm=payAppMap.get(r.app),wr=pm?.wr||canonicalWard(pm?.wardRaw,pm?.zoneRaw),z=wr?.zone||canonicalZone(pm?.zoneRaw);city.collection+=r.amount;if(z)zones[z].collection+=r.amount;else city.unresolvedWard+=r.amount}
    return{city,zones,unclassifiedApps,payAppMap};
  }

  function buildWardRI(wardRows,paymentMaster,receipts){
    const wards=new Map();
    for(const r of wardRows){if(!r.wr)continue;const k=r.wr.zone+'|'+r.wr.ward;const x=wards.get(k)||{zone:r.wr.zone,ward:r.wr.ward,wardNo:r.wr.wardNo,ri:r.wr.ri,post:r.wr.post,applications:0,approved:0,inProcess:0,rejected:0,paidApplicants:0,receipts:0,collection:0,applicantPending:0};x.applications+=r.applications;x.approved+=r.approved;x.inProcess+=r.inProcess;x.rejected+=r.rejected;x.applicantPending+=r.applicant;wards.set(k,x)}
    const pmap=new Map();for(const p of paymentMaster){const wr=canonicalWard(p.wardRaw,p.zoneRaw);if(wr)pmap.set(p.app,wr)}
    const paidWard={};for(const [app,wr] of pmap){const k=wr.zone+'|'+wr.ward;(paidWard[k]??=new Set()).add(app)}
    for(const [k,set] of Object.entries(paidWard)){if(wards.has(k))wards.get(k).paidApplicants=set.size}
    for(const r of receipts){const wr=pmap.get(r.app);if(!wr)continue;const k=wr.zone+'|'+wr.ward;if(!wards.has(k))continue;const x=wards.get(k);x.receipts++;x.collection+=r.amount}
    const ris=new Map();for(const w of wards.values()){const k=w.zone+'|'+w.ri;const x=ris.get(k)||{zone:w.zone,ri:w.ri,applications:0,approved:0,inProcess:0,rejected:0,paidApplicants:0,receipts:0,collection:0,applicantPending:0};for(const f of ['applications','approved','inProcess','rejected','paidApplicants','receipts','collection','applicantPending'])x[f]+=w[f]||0;ris.set(k,x)}
    return{wards:[...wards.values()],ris:[...ris.values()]};
  }

  function stageCounts(inproc){const c={CTO:0,RI:0,TS:0,'With Applicant':0,Other:0};for(const a of inproc){const s=stageForPending(a['Pending with']);c[s]=(c[s]||0)+1}return c}

  window.processReportSet=async function(){
    const fs=[...($('masterFile')?.files||[])];if(!fs.length){uploadMessage('Choose the 7 OTS reports first.',false);return}if(!window.XLSX){uploadMessage('Excel parser could not load.',false);return}
    if(typeof startScramble==='function')startScramble();else document.body.classList.add('recalculating');
    try{
      let apps=[],pm=[],approved=[],inproc=[],receipts=[],wardRows=[],recognized=[];
      for(const f of fs){const wb=XLSX.read(await f.arrayBuffer(),{cellDates:true});const name=NN(f.name);let found=[];
        let x;
        x=parseApplicationsWB(wb);if(x.length){apps.push(...x);found.push(`Applications ${x.length}`)}
        x=parsePaymentMasterWB(wb,name.includes('part')?'PART':'FULL');if(x.length){pm.push(...x);found.push(`${name.includes('part')?'PART':'FULL'} payment ${x.length}`)}
        x=parseApprovedWB(wb);if(x.length){approved.push(...x);found.push(`Approved ${x.length}`)}
        x=parseInProcessWB(wb);if(x.length){inproc.push(...x);found.push(`In-process ${x.length}`)}
        x=parseCollectionWB(wb);if(x.length){receipts.push(...x);found.push(`Receipts ${x.length}`)}
        x=parseWardSummaryWB(wb);if(x.length){wardRows.push(...x);found.push(`Ward summary ${x.length}`)}
        recognized.push(`${f.name}: ${found.join(', ')||'not used'}`)
      }
      apps=dedupe(apps,x=>x['Application number']);pm=dedupe(pm,x=>x.app);approved=dedupe(approved,x=>x.app);inproc=dedupe(inproc,x=>x.app);receipts=dedupe(receipts,x=>x.receipt);wardRows=dedupe(wardRows,x=>[NN(x.zoneRaw),NN(x.wardRaw),x.applications,x.approved,x.inProcess,x.demand].join('|'));
      if(!apps.length)throw Error('applications.xlsx was not recognized (AppNo + Status required).');
      if(!receipts.length)throw Error('CollectionReport was not recognized.');
      if(!wardRows.length)throw Error('Zone/Ward Application Summary was not recognized.');
      const amap=new Map(apps.map(a=>[a['Application number'],a]));
      for(const x of approved){const a=amap.get(x.app);if(a)Object.assign(a,{'Approval date':x['Approval date'],'Received date':x['Received date'],'TS approver':x['TS approver'],'Latest remark':x['Latest remark']})}
      for(const x of inproc){const a=amap.get(x.app);if(a)Object.assign(a,{'Pending with':x['Pending with'],'Pending days':x['Pending days'],'Latest remark':x['Latest remark'],'Received date':x['Received date']})}
      const pmm=new Map(pm.map(p=>[p.app,p]));
      for(const a of apps){const p=pmm.get(a['Application number']);if(p){const wr=canonicalWard(p.wardRaw,p.zoneRaw);a['Allocated zone']=wr?.zone||canonicalZone(p.zoneRaw)||p.zoneRaw;a['Allocated ward']=wr?.ward||p.wardRaw;a['Allocated RI / TC']=wr?.ri||'';a['Allocation basis']='Payment master · actual property';a['Payment state']=p.state}}
      const payments=receipts.map(r=>{const p=pmm.get(r.app),wr=canonicalWard(p?.wardRaw,p?.zoneRaw),z=wr?.zone||canonicalZone(p?.zoneRaw);return{'Application number':r.app,'Payer name':r.name,'Receipt property no.':r.property,'Mobile (masked)':r.mobile,'Receipt number':r.receipt,'Payment date':r.date,'Amount (INR)':r.amount,'Cashier / channel':NN(r.mode).includes('online')?'Online':(r.cashier||'Unknown'),'Receipt mode':r.mode,'Receipt zone (source)':r.sourceZone,'Receipt ward (source)':r.sourceWard,'Actual property zone':z||p?.zoneRaw||'','Actual property ward':wr?.ward||p?.wardRaw||'','Allocated zone':z||p?.zoneRaw||'','Allocated ward':wr?.ward||p?.wardRaw||'','Allocated RI / TC':wr?.ri||'','Property UID':p?.['Property UID']||'','Application house no.':p?.['House / property no.']||r.property,'Application status':amap.get(r.app)?.['Application status']||'','Allocation basis':wr?'FULL/PART payment property master':'Needs classification'}});
      const controls=aggregateControls(apps,wardRows,pm,receipts), perf=buildWardRI(wardRows,pm,receipts), stages=stageCounts(inproc);
      const snapshot=payments.map(p=>p['Payment date']).filter(Boolean).sort().at(-1)||new Date().toISOString().slice(0,10);
      LOCAL={fileName:fs.map(f=>f.name).join(' + '),fileNames:fs.map(f=>f.name),snapshot,applications:apps,payments,wardRows,paymentMaster:pm,controls,wardPerf:perf.wards,riPerf:perf.ris,stageCounts:stages,inProcessRows:inproc,recognized,loadedAt:new Date().toISOString()};
      await saveSnapshot(LOCAL);rebuildDateSelector();$('asof').value='latest';$('modeLabel').textContent=`LOCAL 7-REPORT VERIFIED · ${dateLabel(snapshot).toUpperCase()}`;$('integrity').textContent='VERIFIED';
      uploadMessage(`Verified: ${num(controls.city.applications)} applications · ${num(controls.city.approved)} approved · ${num(controls.city.inProcess)} in-process · ${num(controls.city.payingApps)} paid applicants · ${num(payments.length)} receipts · ${money(controls.city.collection)}`,true);
      if(typeof stopScramble==='function')stopScramble();else{document.body.classList.remove('recalculating');renderAll()}
      setTimeout(closeReports,900);
    }catch(e){if(typeof stopScramble==='function')stopScramble();else document.body.classList.remove('recalculating');uploadMessage(e.message||String(e),false)}
  };
  window.processWorkbook=window.processReportSet;
  const submit=document.querySelector('#reportModal .btn.primary');if(submit)submit.onclick=window.processReportSet;

  window.currentControl=function(zone){
    if(!LOCAL?.controls)return zoneControl(zone);
    const b=zone==='All'?LOCAL.controls.city:LOCAL.controls.zones[zone];const cm=getCollectionMetrics(zone);
    return{...b,collection:cm.total,summaryReceived:cm.total};
  };
  window.getDaily=function(zone){
    if(!LOCAL)return zone==='All'?PUBLIC.cityDaily:(PUBLIC.zoneDaily[zone]||[]);
    const m={};for(const p of LOCAL.payments){const r=resolveRecord(p,true);if(zone!=='All'&&r.zone!==zone)continue;const d=p['Payment date'];if(!d)continue;m[d]??={date:d,receipts:0,amount:0};m[d].receipts++;m[d].amount+=numv(p['Amount (INR)'])}return Object.values(m).sort((a,b)=>a.date.localeCompare(b.date));
  };
  window.getCashierRows=function(){
    if(!LOCAL)return selectedZone()==='All'?PUBLIC.cashiers:(PUBLIC.zoneCashiers[selectedZone()]||[]).map(x=>({name:x.cashier,receipts:x.receipts,amount:x.amount}));
    const z=selectedZone(),m={};for(const p of LOCAL.payments){const r=resolveRecord(p,true);if(z!=='All'&&r.zone!==z)continue;const c=p['Cashier / channel']||'Unknown';m[c]??={name:c,receipts:0,amount:0};m[c].receipts++;m[c].amount+=numv(p['Amount (INR)'])}return Object.values(m).sort((a,b)=>b.amount-a.amount);
  };
  window.renderRIWardPerformance=function(){
    const box=$('riWardLive');if(!box)return;if(!LOCAL?.wardPerf){box.innerHTML='<div class="notice">Upload the 7 reports to calculate RI / Ward performance.</div>';return}
    const z=selectedZone(),q=NN($('search').value);let ris=LOCAL.riPerf.filter(r=>(z==='All'||r.zone===z)&&(!q||[r.zone,r.ri].some(v=>NN(v).includes(q))));let wards=LOCAL.wardPerf.filter(r=>(z==='All'||r.zone===z)&&(!q||[r.zone,r.ward,r.ri,r.wardNo].some(v=>NN(v).includes(q))));
    ris.sort((a,b)=>a.zone.localeCompare(b.zone)||a.ri.localeCompare(b.ri));wards.sort((a,b)=>a.zone.localeCompare(b.zone)||Number(a.wardNo)-Number(b.wardNo));
    $('riPerfBody').innerHTML=ris.map(r=>`<tr><td>${esc(r.zone)}</td><td><b>${esc(r.ri)}</b></td><td class="num">${num(r.applications)}</td><td class="num">${num(r.approved)}</td><td class="num">${num(r.inProcess)}</td><td class="num">${num(r.paidApplicants)}</td><td class="num">${num(r.receipts)}</td><td class="num">${money(r.collection)}</td><td class="num">—</td><td class="num">—</td><td class="num">${num(r.applicantPending)}</td></tr>`).join('')||'<tr><td colspan="11">No mapped RI data in this filter.</td></tr>';
    $('wardPerfBody').innerHTML=wards.map(r=>`<tr><td>${esc(r.zone)}</td><td>${esc(r.wardNo)}</td><td><b>${esc(r.ward)}</b></td><td>${esc(r.ri)}</td><td class="num">${num(r.applications)}</td><td class="num">${num(r.approved)}</td><td class="num">${num(r.inProcess)}</td><td class="num">${num(r.paidApplicants)}</td><td class="num">${num(r.receipts)}</td><td class="num">${money(r.collection)}</td></tr>`).join('')||'<tr><td colspan="10">No mapped ward data in this filter.</td></tr>';
  };
  window.renderWorkflow=function(){
    if(!LOCAL?.stageCounts){OLD_RENDER_WORKFLOW();return}
    const z=selectedZone(),c=LOCAL.stageCounts;
    $('workflowHint').textContent=z==='All'?'Exact current pendency from InProcessReport.':`${z}: Applicant pendency is exact from ward summary; RI/TS/CTO split cannot be safely assigned to a zone unless the report identifies property ownership.`;
    let vals;if(z==='All')vals={CTO:c.CTO,RI:c.RI,TS:c.TS,'With Applicant':c['With Applicant'],Other:c.Other};else{const zz=LOCAL.controls.zones[z];vals={CTO:'—',RI:'—',TS:'—','With Applicant':zz.applicantPending,Other:'—'}}
    $('workflowCards').innerHTML=[['CTO',vals.CTO],['RI',vals.RI],['TS',vals.TS],['With Applicant',vals['With Applicant']],['Other / IT',vals.Other]].map(x=>`<div class="mini"><span>${x[0]}</span><b>${typeof x[1]==='number'?num(x[1]):x[1]}</b></div>`).join('');
  };

  const oldRenderAll=window.renderAll;window.renderAll=function(){oldRenderAll();if(window.renderRIWardPerformance)renderRIWardPerformance();if(LOCAL?.stageCounts)renderWorkflow()};
})();
