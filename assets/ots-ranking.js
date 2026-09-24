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
    const el = root && root.querySelector('#' + id);
    if (el) el.textContent = value;
  }
  function paint(r) {
    current = r;
    if (!root) return;
    const exists = !!r && Number.isInteger(Number(r.rank));
    putText('otsRankPosition', exists ? '#' + r.rank + ' / ' + r.count : 'Awaiting ranking report');
    putText('otsRankAmount', exists ? money(r.amount) + ' · Received amount' : 'Upload the 75-ULB Excel report to calculate Agra’s position.');
    putText('otsRankSource', exists ? 'Source: ' + (r.source_name || 'Ranking Excel') : 'Ranking source not yet uploaded');
    putText('otsRankDate', exists ? 'Report date: ' + dateLabel(r.source_date) + ' · Uploaded: ' + dateLabel(r.updated_at) : 'No ranking snapshot published');
    putText('otsRankGap', exists ? (r.gap_to_next == null ? 'Already at highest collection rank' : money(r.gap_to_next) + ' gap to next higher amount') : '—');
    putText('otsRankBuffer', exists ? (r.buffer_to_lower == null ? 'No lower amount in the report' : money(r.buffer_to_lower) + ' ahead of next lower ULB') : '—');
    const delta = root.querySelector('#otsRankDelta');
    if (delta) {
      delta.className = 'ots-rank-delta';
      if (!exists || r.delta == null) delta.textContent = '— First ranking snapshot';
      else if (r.delta > 0) { delta.classList.add('up'); delta.textContent = '▲ Up ' + r.delta + ' since previous upload'; }
      else if (r.delta < 0) { delta.classList.add('down'); delta.textContent = '▼ Down ' + Math.abs(r.delta) + ' since previous upload'; }
      else { delta.classList.add('flat'); delta.textContent = '● Rank unchanged'; }
    }
    const list = root.querySelector('#otsRankTop5');
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

  function mount() {
    const host=document.querySelector('#productionDashboard');
    if(!host) return;
    if(root && root.isConnected) return;
    root=document.createElement('section');
    root.id='otsRankingSection';
    root.className='ots-ranking-module';
    root.setAttribute('aria-label','Independent Uttar Pradesh OTS ranking');
    root.innerHTML=String.raw`<div class="ots-rank-card">
       <div class="ots-rank-head"><span class="ots-rank-icon">🏆</span><div><h3>UP OTS Ranking · Agra</h3><small>Received amount ranking · uploaded ULB report</small></div></div>
       <div class="ots-rank-overview"><div id="otsRankPosition" class="ots-rank-position">Awaiting ranking report</div><span id="otsRankDelta" class="ots-rank-delta">— First ranking snapshot</span></div>
       <div id="otsRankAmount" class="ots-rank-amount">Upload a ranking report to calculate Agra's position.</div>
       <div class="ots-rank-gaps"><div><small>Gap to next rank</small><strong id="otsRankGap">—</strong></div><div><small>Buffer above next lower ULB</small><strong id="otsRankBuffer">—</strong></div></div>
       <h4>Top 5 ULBs · received amount</h4><ol id="otsRankTop5" class="ots-rank-top"></ol>
       <p id="otsRankSource" class="ots-rank-source">Ranking source not yet uploaded</p><p id="otsRankDate" class="ots-rank-source">No ranking snapshot published</p>
       <p class="ots-rank-note">▲ Higher rank · ▼ lower rank compared with previous uploaded snapshot. Figures reflect the ranking Excel only, not the 7-report OTS collection.</p>
     </div>
     <div class="ots-rank-upload">
       <div class="ots-rank-head"><span class="ots-rank-icon">▤</span><div><h3>Ranking Excel Upload</h3><small>Independent of Manage Reports</small></div></div>
       <label class="ots-rank-file-label" for="otsRankFile">Choose ranking Excel (.xls / .xlsx / .csv)</label>
       <input id="otsRankFile" type="file" accept=".xls,.xlsx,.csv" />
       <label class="ots-rank-date-label" for="otsRankSourceDate">Source report date (optional)</label>
       <input id="otsRankSourceDate" type="date" />
       <div class="ots-rank-credentials"><label>Dashboard admin username<input id="otsRankAdminUser" autocomplete="username" type="text" /></label><label>Dashboard admin password<input id="otsRankAdminPassword" autocomplete="current-password" type="password" /></label></div>
       <button type="button" id="otsRankPublish" disabled>Upload Ranking Sheet</button>
       <div class="ots-rank-message" id="otsRankMessage" aria-live="polite">Only this ranking module is updated. Seven-report uploader and its calculations remain untouched.</div>
     </div>`;
    const anchor=host.querySelector('.prod-kpis');
    if(anchor) anchor.insertAdjacentElement('afterend',root);
    else host.insertBefore(root,host.firstChild);
    controls.file=root.querySelector('#otsRankFile');
    controls.date=root.querySelector('#otsRankSourceDate');
    controls.user=root.querySelector('#otsRankAdminUser');
    controls.password=root.querySelector('#otsRankAdminPassword');
    controls.publish=root.querySelector('#otsRankPublish');
    controls.message=root.querySelector('#otsRankMessage');
    controls.file.addEventListener('change',previewFile);
    controls.publish.addEventListener('click',publish);
    paint(current);
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
