(function(){
'use strict';
const ADMIN_USER='9997096978';
const ADMIN_PASS_SHA256='b2fceabfa728f3cdc62522420cba0bb830406ab22af435292241d3d25f0f4bba';
const AUTH_KEY='ots_admin_session_v1';
const UPDATE_KEY='ots_last_report_update_v1';
const SLOTS=[[9,0],[14,0],[17,30],[21,0]];
const ORIGINAL_OPEN_REPORTS=window.openReports;
const ORIGINAL_PROCESS=window.processReportSet||window.processWorkbook;

function fmtDate(iso){
  if(!iso)return'—';
  const m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return String(iso);
  return new Date(Number(m[1]),Number(m[2])-1,Number(m[3])).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
}
function currentReportDate(){
  return window.OTS7?.snapshot||window.LOCAL?.snapshot||window.PUBLIC?.snapshot||'';
}
function nextSlot(now=new Date()){
  for(const [h,m] of SLOTS){const d=new Date(now);d.setHours(h,m,0,0);if(d>now)return d;}
  const d=new Date(now);d.setDate(d.getDate()+1);d.setHours(9,0,0,0);return d;
}
function slotText(d){return d.toLocaleString('en-IN',{weekday:'short',day:'2-digit',month:'short',hour:'numeric',minute:'2-digit',hour12:true});}
function updateLiveLabels(){
  const rd=currentReportDate();
  const label=document.getElementById('modeLabel');
  if(label){
    const local=!!(window.OTS7?.loaded||window.LOCAL);
    label.textContent=`${local?'LIVE LOADED REPORT':'PUBLIC SNAPSHOT'} · THROUGH ${fmtDate(rd).toUpperCase()}`;
  }
  const strip=document.getElementById('reportScheduleStrip');
  if(strip){
    const last=localStorage.getItem(UPDATE_KEY);
    const next=nextSlot();
    strip.innerHTML=`<div><span class="live-dot"></span><b>REPORT UPDATE SCHEDULE</b></div><div class="schedule-times">09:00 AM · 02:00 PM · 05:30 PM · 09:00 PM</div><div class="schedule-meta"><span>Report through: <b>${fmtDate(rd)}</b></span><span>Next scheduled update: <b>${slotText(next)}</b></span>${last?`<span>This browser last loaded: <b>${new Date(last).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'numeric',minute:'2-digit',hour12:true})}</b></span>`:''}</div>`;
  }
}
function installSchedule(){
  if(document.getElementById('reportScheduleStrip'))return;
  const hero=document.querySelector('.hero');if(!hero)return;
  const strip=document.createElement('section');strip.id='reportScheduleStrip';strip.className='notice';strip.style.cssText='margin:10px 0 14px;display:flex;align-items:center;gap:16px;justify-content:space-between;flex-wrap:wrap;padding:12px 14px';
  hero.insertAdjacentElement('afterend',strip);
  const st=document.createElement('style');st.id='adminLiveStyle';st.textContent=`#reportScheduleStrip>div:first-child{display:flex;align-items:center;gap:8px;letter-spacing:.08em;font-size:10px}.schedule-times{font-weight:800;color:#dffcff;white-space:nowrap}.schedule-meta{display:flex;gap:14px;flex-wrap:wrap;color:#87a6b9;font-size:10px}.schedule-meta b{color:#edf9ff}.admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}.admin-field{display:flex;flex-direction:column;gap:5px}.admin-field label{font-size:9px;color:#7896aa;text-transform:uppercase;letter-spacing:.08em}.admin-field input{min-height:44px}.report-checklist{display:grid;gap:7px;margin-top:10px}.report-line{display:grid;grid-template-columns:22px 1fr auto;gap:8px;align-items:center;padding:8px 10px;border:1px solid rgba(104,236,255,.08);border-radius:10px;background:rgba(255,255,255,.015)}.report-line .status{font-size:9px}.report-line.ok .status{color:#62ffd7}.report-line.bad .status{color:#ffbf70}@media(max-width:650px){.admin-grid{grid-template-columns:1fr}.schedule-times{white-space:normal}}`;
  document.head.appendChild(st);
  updateLiveLabels();setInterval(updateLiveLabels,60000);
}
function ensureLoginModal(){
  if(document.getElementById('adminLoginModal'))return;
  const m=document.createElement('div');m.id='adminLoginModal';m.className='modal';
  m.innerHTML=`<div class="modalbox" style="max-width:520px"><div style="display:flex;justify-content:space-between;gap:12px"><div><h2 style="margin:0;font-size:20px">Administrator Login</h2><p style="color:#7896aa;font-size:11px;margin:5px 0 0">Report upload access is restricted. Dashboard viewing remains public.</p></div><button class="btn" id="adminClose">✕</button></div><form id="adminLoginForm" class="admin-grid"><div class="admin-field"><label for="adminUser">Username</label><input class="control" id="adminUser" autocomplete="username" inputmode="numeric" required></div><div class="admin-field"><label for="adminPass">Password</label><input class="control" id="adminPass" type="password" autocomplete="current-password" required></div><div id="adminLoginMsg" class="msg" style="grid-column:1/-1"></div><div style="grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px"><button class="btn" type="button" id="adminCancel">Cancel</button><button class="btn primary" type="submit">Login & Open Reports</button></div></form></div>`;
  document.body.appendChild(m);
  const close=()=>m.classList.remove('on');
  document.getElementById('adminClose').onclick=close;document.getElementById('adminCancel').onclick=close;
  document.getElementById('adminLoginForm').addEventListener('submit',async e=>{
    e.preventDefault();const u=document.getElementById('adminUser').value.trim(),p=document.getElementById('adminPass').value;
    const hash=await sha256(p);const msg=document.getElementById('adminLoginMsg');
    if(u===ADMIN_USER&&hash===ADMIN_PASS_SHA256){sessionStorage.setItem(AUTH_KEY,'1');msg.className='msg show ok';msg.textContent='Access granted.';document.getElementById('adminPass').value='';setTimeout(()=>{close();ORIGINAL_OPEN_REPORTS();enhanceReportModal()},180)}
    else{msg.className='msg show err';msg.textContent='Invalid username or password.';}
  });
}
async function sha256(text){const data=new TextEncoder().encode(text);const buf=await crypto.subtle.digest('SHA-256',data);return[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
window.openReports=function(){
  ensureLoginModal();
  if(sessionStorage.getItem(AUTH_KEY)==='1'){ORIGINAL_OPEN_REPORTS();enhanceReportModal();return;}
  const m=document.getElementById('adminLoginModal');m.classList.add('on');setTimeout(()=>document.getElementById('adminUser')?.focus(),80);
};
function classifyName(name){
  const s=String(name||'').toLowerCase();
  if(/zone.*ward.*app|ward.*app.*summ/.test(s))return'zone';
  if(/collectionreport|collection.*report/.test(s))return'collection';
  if(/inprocess|in.process/.test(s))return'inprocess';
  if(/approvedapplicationsummary|approved.*application.*summary/.test(s))return'approved';
  if(/part.*paymentdata|part.*payment/.test(s))return'part';
  if(/full.*paymentdata|full.*payment/.test(s))return'full';
  if(/applications/.test(s)&&!/approved/.test(s))return'apps';
  return'unknown';
}
const EXPECTED=[
 ['apps','Applications Master','applications(1).xlsx'],['zone','Zone / Ward Application Summary','zone ward app summarry.xls'],['collection','Collection Report','CollectionReport.xls'],['full','FULL Payment Data','FULL PaymentData.xlsx'],['part','PART Payment Data','PART PaymentData.xlsx'],['inprocess','In-Process Report','InProcessReport.xls'],['approved','Approved Applications','ONE ApprovedApplicationSummaryReport.xls']
];
function validateFiles(files){const counts={};for(const f of files){const k=classifyName(f.name);counts[k]=(counts[k]||0)+1}const missing=EXPECTED.filter(([k])=>(counts[k]||0)!==1).map(([k,label])=>label);return{counts,missing,ok:files.length===7&&missing.length===0&&(counts.unknown||0)===0}}
function renderChecklist(){
  const box=document.getElementById('reportChecklist');const input=document.getElementById('masterFile');if(!box||!input)return;
  const v=validateFiles([...input.files]);box.innerHTML=EXPECTED.map(([k,label,example])=>{const c=v.counts[k]||0;return`<div class="report-line ${c===1?'ok':'bad'}"><span>${c===1?'✓':'○'}</span><div><b>${label}</b><small style="display:block;color:#7896aa">${example}</small></div><span class="status">${c===1?'READY':c>1?`FOUND ${c} · KEEP ONE`:'MISSING'}</span></div>`}).join('')+(v.counts.unknown?`<div class="notice" style="margin-top:8px">${v.counts.unknown} unrecognized file(s) selected.</div>`:'');
  const btn=document.querySelector('#reportModal .btn.primary');if(btn){btn.disabled=!v.ok;btn.title=v.ok?'Ready to calculate':'Select exactly the seven required report types';}
}
function enhanceReportModal(){
  const modal=document.getElementById('reportModal');if(!modal)return;
  let box=document.getElementById('reportChecklist');if(!box){box=document.createElement('div');box.id='reportChecklist';box.className='report-checklist';const drop=modal.querySelector('.drop');drop?.insertAdjacentElement('afterend',box)}
  const p=modal.querySelector('.modalbox p');if(p)p.textContent='Admin-only upload. Select exactly the seven reports below; the calculator will reconcile City → Zone → RI → Ward.';
  const input=document.getElementById('masterFile');if(input&&!input.dataset.checkInstalled){input.dataset.checkInstalled='1';input.addEventListener('change',renderChecklist)}
  renderChecklist();
}
window.processReportSet=async function(){
  if(sessionStorage.getItem(AUTH_KEY)!=='1'){window.openReports();return;}
  const files=[...(document.getElementById('masterFile')?.files||[])],v=validateFiles(files);
  if(!v.ok){if(window.uploadMessage)uploadMessage('Select exactly 7 reports: Applications, Zone/Ward Summary, Collection, FULL Payment, PART Payment, In-Process, and one Approved Applications report.',false);return;}
  await ORIGINAL_PROCESS.apply(this,arguments);
  if(window.OTS7?.loaded||window.LOCAL){localStorage.setItem(UPDATE_KEY,new Date().toISOString());updateLiveLabels();}
};
window.processWorkbook=window.processReportSet;
const oldRender=window.renderAll;
if(typeof oldRender==='function')window.renderAll=function(){const x=oldRender.apply(this,arguments);updateLiveLabels();return x};
installSchedule();ensureLoginModal();enhanceReportModal();updateLiveLabels();
})();
