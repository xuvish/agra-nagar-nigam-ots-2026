/* Independent ranking module for /ots/. Does not read/write the seven-report calculation state. */
(function () {
  'use strict';
  const API = 'https://pdtongvzntgvwnkhkxti.supabase.co/functions/v1/ots-ulb-ranking';
  const money = n => '₹' + Number(n).toLocaleString('en-IN', {maximumFractionDigits:2});
  const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  const controls = {};
  let current = null, pending = null, busy = false, root = null;

  function setMessage(message, bad) {
    if (!controls.message) return;
    controls.message.textContent = message;
    controls.message.className = 'ots-rank-message' + (bad ? ' bad' : '');
  }
  function dateLabel(value) {
    if (!value) return 'Source date not supplied';
    const dt = new Date(value.length===10 ? value+'T00:00:00' : value);
    return Number.isNaN(dt.getTime()) ? value : dt.toLocaleString('en-IN', value.length===10
      ? {day:'2-digit',month:'short',year:'numeric'}
      : {day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});
  }
  function putText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
  function paint(r) {
    current = r;
    if (!root) return;
    const exists = !!r && Number.isInteger(Number(r.rank));
    putText('otsRankPosition', exists ? '#' + r.rank + ' / ' + r.count : '— / —');
    putText('otsRankFullPosition', exists ? '#' + r.rank + ' / ' + r.count : 'Awaiting ranking report');
    putText('otsRankAmount', exists ? money(r.amount) + ' · Received amount' : 'Upload the 75-ULB Excel report to calculate Agra’s position.');
    putText('otsRankSource', exists ? 'Source: ' + (r.source_name || 'Ranking Excel') : 'Ranking source not yet uploaded');
    putText('otsRankDate', exists ? 'Report date: ' + dateLabel(r.source_date) + ' · Uploaded: ' + dateLabel(r.updated_at) : 'No ranking snapshot published');
    putText('otsRankGap', exists ? (r.gap_to_next == null ? 'Already at highest collection rank' : money(r.gap_to_next) + ' gap to next higher amount') : '—');
    putText('otsRankBuffer', exists ? (r.buffer_to_lower == null ? 'No lower amount in the report' : money(r.buffer_to_lower) + ' ahead of next lower ULB') : '—');
    const delta = document.getElementById('otsRankDelta');
    if (delta) {
      delta.className = 'ots-rank-delta';
      if (!exists || r.delta == null) delta.textContent = '— First ranking snapshot';
      else if (r.delta > 0) { delta.classList.add('up'); delta.textContent = '▲ Up ' + r.delta + ' since previous upload'; }
      else if (r.delta < 0) { delta.classList.add('down'); delta.textContent = '▼ Down ' + Math.abs(r.delta) + ' since previous upload'; }
      else { delta.classList.add('flat'); delta.textContent = '● Rank unchanged'; }
    }
    putText('otsRankLeader', exists && r.top5?.length ? '#1 ' + r.top5[0].name : 'Tap for ranking details');
    const list = document.getElementById('otsRankTop5');
    if (list) {
      list.replaceChildren();
      if (!exists) {
        const li = document.createElement('li'); li.textContent = 'No source report yet'; list.appendChild(li);
      } else {
        for (const entry of r.top5 || []) {
          const li = document.createElement('li');
          const left = document.createElement('span');
          left.textContent = '#' + entry.rank + '  ' + entry.name;
          const right = document.createElement('strong'); right.textContent = money(entry.amount);
          li.append(left,right); list.appendChild(li);
        }
      }
    }
  }

  async function retrieve() {
    try {
      const res = await fetch(API, {cache:'no-store'});
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || 'Ranking service unavailable');
      paint(body.ranking);
    } catch (err) {
      paint(null);
      putText('otsRankSource', 'Ranking service temporarily unavailable');
      setMessage(String(err.message || err), true);
    }
  }

  function detectHeader(sheet) {
    const rows = XLSX.utils.sheet_to_json(sheet, {header:1,defval:'',raw:true});
    let best = null;
    for (let i=0;i<Math.min(rows.length,50);i++) {
      const headers = (rows[i] || []).map(norm);
      const name = headers.findIndex(h => h==='ulb name' || h==='name of ulb' || h==='ulb' || h==='local body name' || h==='name of local body' || h.includes('ulb name'));
      if (name<0) continue;
      const candidates = headers.map((h,j) => {
        if (j===name || /demand|waiver|discount|tax due|percentage|percent|rate|per application|balance|pending/.test(h)) return {index:j,score:-1};
        let score = -1;
        if (/total money received|total amount received|total received amount|total collection|total money collection/.test(h)) score=30;
        else if (/money received|received amount|amount received|total receipt|collection amount|collection inr/.test(h)) score=20;
        else if (/^collection$|^receipts amount$/.test(h)) score=10;
        if (/application.*down.*post|app.*down.*post/.test(h)) score=40;
        return {index:j,score};
      }).sort((a,b)=>b.score-a.score);
      if (candidates[0]?.score>0 && (!best || candidates[0].score>best.score)) best={rows,headerIndex:i,nameIndex:name,amountIndex:candidates[0].index,score:candidates[0].score,header:rows[i][candidates[0].index]};
    }
    return best;
  }
  function parseAmount(v) {
    if (typeof v==='number') return Number.isFinite(v) ? v : NaN;
    let s=String(v??'').trim();
    if (!s) return NaN;
    s=s.replace(/[₹,\s]/g,'');
    if (!/^\(?\d+(?:\.\d+)?\)?$/.test(s)) return NaN;
    return Number(s.replace(/[()]/g,''));
  }
  async function parseFile(file) {
    if (!/\.(xls|xlsx|csv)$/i.test(file.name)) throw new Error('Choose an .xls, .xlsx or .csv ranking report.');
    if (file.size>8*1024*1024) throw new Error('Ranking report exceeds 8 MB.');
    if (!window.XLSX) throw new Error('Excel reader failed to load. Reload this page.');
    const wb = XLSX.read(await file.arrayBuffer(), {type:'array',raw:true});
    const matches = wb.SheetNames.map(name=>({name,match:detectHeader(wb.Sheets[name])})).filter(x=>x.match);
    if (!matches.length) throw new Error('ULB Name and total money/amount received columns were not found. Upload the original 75-ULB report.');
    matches.sort((a,b)=>b.match.score-a.match.score);
    const {match}=matches[0], out=[], seen=new Set();
    for (const line of match.rows.slice(match.headerIndex+1)) {
      const name=String(line[match.nameIndex]??'').trim(), amount=parseAmount(line[match.amountIndex]);
      if (!name || /^(total|grand total|sub total|overall|all ulbs)$/i.test(name)) continue;
      if (!Number.isFinite(amount)) continue;
      const key=norm(name);
      if (seen.has(key)) throw new Error('Duplicate ULB in report: ' + name);
      seen.add(key);
      out.push({name,amount});
    }
    if (out.length<10 || out.length>500) throw new Error('Only '+out.length+' ULB rows recognized. Check that this is the full source report.');
    if (out.filter(r=>['agra nagar nigam','nagar nigam agra','agra municipal corporation'].includes(norm(r.name))).length!==1) throw new Error('A unique Agra Nagar Nigam row was not found.');
    return {rows:out,column:String(match.header)};
  }

  async function previewFile() {
    pending = null;
    const file = controls.file.files[0];
    controls.publish.disabled = true;
    if (!file) {setMessage('Choose the ranking Excel sheet.',true);return;}
    try {
      setMessage('Checking independent ranking sheet…',false);
      pending = await parseFile(file);
      setMessage(pending.rows.length+' ULB rows detected. Amount basis: '+pending.column+'. This will not alter the seven OTS reports.',false);
      controls.publish.disabled = false;
    } catch(err) {setMessage(err.message||String(err),true);}
  }

  async function publish() {
    if (busy || !pending) return;
    const cred=window.__otsAdminCred;
    const username=cred?.username || controls.user.value.trim();
    const password=cred?.password || controls.password.value;
    if (!username || !password) {
      setMessage('Enter dashboard administrator credentials in this separate ranking panel.',true);
      return;
    }
    busy=true; controls.publish.disabled=true; setMessage('Publishing ranking separately…',false);
    try {
      const body={username,password,rows:pending.rows,source_name:controls.file.files[0]?.name||'Ranking Excel',source_date:controls.date.value||null};
      const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data=await res.json();
      if(!res.ok||!data.ok)throw new Error(data.error||'Ranking publish failed');
      await retrieve();
      setMessage('Ranking published for all website visitors. Existing seven-report calculations unchanged.',false);
      controls.password.value='';
      pending=null; controls.publish.disabled=true;
    }catch(err){setMessage(err.message||String(err),true);controls.publish.disabled=false}
    finally{busy=false}
  }


  // Modals live outside the dashboard render target, so data refreshes do not close them.
  function makeModal(id, html) {
    let overlay=document.getElementById(id);
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id=id;
    overlay.className='ots-rank-overlay';
    overlay.hidden=true;
    overlay.innerHTML=html;
    document.body.appendChild(overlay);
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeModal(overlay)});
    overlay.querySelectorAll('[data-rank-close]').forEach(b=>b.addEventListener('click',()=>closeModal(overlay)));
    return overlay;
  }
  let lastTrigger=null;
  function openModal(overlay,trigger) {
    lastTrigger=trigger || document.activeElement;
    overlay.hidden=false;
    const focus=overlay.querySelector('input,button');
    if(focus)focus.focus();
  }
  function closeModal(overlay) {
    overlay.hidden=true;
    if(lastTrigger && lastTrigger.isConnected)lastTrigger.focus();
  }
  function ensureModals() {
    const details=makeModal('otsRankDetailsModal',[
      '<div class="ots-rank-dialog" role="dialog" aria-modal="true" aria-labelledby="otsRankDetailTitle">',
       '<header class="ots-rank-dialog-head"><div><h2 id="otsRankDetailTitle">UP OTS Ranking · Agra</h2><p>Separate statewide ranking report</p></div><button type="button" data-rank-close aria-label="Close ranking details">×</button></header>',
       '<div class="ots-rank-details"><div class="ots-rank-full-number" id="otsRankFullPosition">—</div><p id="otsRankAmount">Upload the report for ranking.</p>',
        '<div class="ots-rank-gaps"><div><small>Gap to next higher ULB</small><strong id="otsRankGap">—</strong></div><div><small>Buffer to next lower ULB</small><strong id="otsRankBuffer">—</strong></div></div>',
        '<h3>Top 5 ULBs · Received amount</h3><ol id="otsRankTop5" class="ots-rank-top"></ol>',
        '<p id="otsRankSource" class="ots-rank-source">No report uploaded</p><p id="otsRankDate" class="ots-rank-source">—</p>',
        '<p class="ots-rank-note">Rank movement compares this upload with the preceding upload. It does not change your OTS collection or application calculations.</p>',
       '</div>',
      '</div>'
    ].join(''));
    const upload=makeModal('otsRankUploadModal',[
      '<div class="ots-rank-dialog" role="dialog" aria-modal="true" aria-labelledby="otsRankUploadTitle">',
       '<header class="ots-rank-dialog-head"><div><h2 id="otsRankUploadTitle">Upload Ranking Report</h2><p>Independent Excel upload · 7 OTS reports unchanged</p></div><button type="button" data-rank-close aria-label="Close ranking upload">×</button></header>',
       '<div class="ots-rank-form">',
        '<label for="otsRankFile">Ranking Excel (.xls / .xlsx / .csv)</label><input id="otsRankFile" type="file" accept=".xls,.xlsx,.csv" />',
        '<label for="otsRankSourceDate">Source report date (optional)</label><input id="otsRankSourceDate" type="date" />',
        '<div class="ots-rank-credentials"><label>Dashboard admin username<input id="otsRankAdminUser" autocomplete="username" type="text" /></label><label>Dashboard admin password<input id="otsRankAdminPassword" autocomplete="current-password" type="password" /></label></div>',
        '<button type="button" id="otsRankPublish" disabled>Upload Ranking Sheet</button>',
        '<div class="ots-rank-message" id="otsRankMessage" aria-live="polite">Select an Excel report. This does not affect Manage Reports or its calculations.</div>',
       '</div>',
      '</div>'
    ].join(''));
    if(!controls.file) {
      controls.file=upload.querySelector('#otsRankFile');
      controls.date=upload.querySelector('#otsRankSourceDate');
      controls.user=upload.querySelector('#otsRankAdminUser');
      controls.password=upload.querySelector('#otsRankAdminPassword');
      controls.publish=upload.querySelector('#otsRankPublish');
      controls.message=upload.querySelector('#otsRankMessage');
      controls.file.addEventListener('change',previewFile);
      controls.publish.addEventListener('click',publish);
      document.addEventListener('keydown',e=>{
        if(e.key!=='Escape')return;
        if(!upload.hidden){e.preventDefault();closeModal(upload);}
        else if(!details.hidden){e.preventDefault();closeModal(details);}
      });
    }
    return {details,upload};
  }
  function mount() {
    const host=document.querySelector('#productionDashboard');
    if(!host)return;
    const kpis=host.querySelector('.prod-kpis');
    if(!kpis)return;
    if(root && root.isConnected && root.parentElement===kpis)return;
    const modals=ensureModals();
    root=document.createElement('section');
    root.id='otsRankingSection';
    root.className='ots-ranking-module';
    root.setAttribute('aria-label','Agra ULB ranking widget');
    root.innerHTML=[
      '<div class="ots-rank-tile">',
       '<div class="ots-rank-mini-head"><span>🏆 UP OTS Ranking</span><button type="button" id="otsRankOpenUpload">Upload Report ↗</button></div>',
       '<div class="ots-rank-upper"><strong id="otsRankPosition">—</strong><span class="ots-rank-delta" id="otsRankDelta">First snapshot</span></div>',
       '<div class="ots-rank-divider" aria-hidden="true"></div>',
       '<button type="button" id="otsRankOpenDetails" class="ots-rank-lower"><span><b>Top 5 ULBs</b><small id="otsRankLeader">Tap for ranking details</small></span><strong>View all ›</strong></button>',
      '</div>'
    ].join('');
    kpis.insertBefore(root,kpis.firstChild);
    root.querySelector('#otsRankOpenUpload').onclick=e=>openModal(modals.upload,e.currentTarget);
    root.querySelector('#otsRankOpenDetails').onclick=e=>openModal(modals.details,e.currentTarget);
    paint(current);
    putText('otsRankFullPosition',current&&Number.isInteger(Number(current.rank))?'#'+current.rank+' / '+current.count:'Awaiting ranking report');
  }
  let observedHost = null;
  function ensureMount() {
    mount();
    const host=document.querySelector('#productionDashboard');
    if(host && host!==observedHost) {
      observedHost=host;
      new MutationObserver(mount).observe(host,{childList:true});
    }
  }
  function start() {
    ensureMount();
    document.addEventListener('ots:bootstrap-ready', ensureMount);
    document.addEventListener('ots:shared-ready', ensureMount);
    window.addEventListener('load', ensureMount);
    retrieve();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
