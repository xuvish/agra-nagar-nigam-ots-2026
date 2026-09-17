(function(){
'use strict';
const LAST_KEY='ots_official_last_updated_v2';
const FP_KEY='ots_official_last_fingerprint_v2';
const TIMES=[[9,0],[14,0],[17,30],[21,0]];
const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const N=v=>String(v??'').trim();
function local(){try{return (typeof LOCAL!=='undefined'&&LOCAL)?LOCAL:null}catch(e){return null}}
function pub(){try{return (typeof PUBLIC!=='undefined'&&PUBLIC)?PUBLIC:null}catch(e){return null}}
function snapshot(){const L=local(),P=pub();return N(L?.snapshot||L?.snapshotDate||L?.meta?.snapshot||window.SHARED_LIVE?.snapshot||P?.snapshot||P?.snapshotDate||P?.meta?.snapshot)}
function city(){const L=local(),P=pub();return L?.city||L?.controls?.city||window.SHARED_LIVE?.city||P?.city||{}}
function fingerprint(){const L=local(),c=city();return [snapshot(),c.applications??L?.applications?.length??'',c.approved??'',c.inProcess??'',c.collection??'',c.receipts??L?.payments?.length??''].join('|')}
function fmtDate(v){const m=N(v).match(/(\d{4})-(\d{2})-(\d{2})/);return m?`${Number(m[3])} ${months[Number(m[2])-1]} ${m[1]}`:(N(v)||'—')}
function fmtStamp(v){if(!v)return'—';const d=new Date(v);if(Number.isNaN(d.getTime()))return N(v);let h=d.getHours(),amp=h>=12?'PM':'AM';h=h%12||12;return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${h}:${String(d.getMinutes()).padStart(2,'0')} ${amp}`}
function nextSchedule(){const now=new Date();for(const [h,m] of TIMES){const d=new Date(now);d.setHours(h,m,0,0);if(d>now)return fmtSchedule(d)}const d=new Date(now);d.setDate(d.getDate()+1);d.setHours(TIMES[0][0],TIMES[0][1],0,0);return fmtSchedule(d)}
function fmtSchedule(d){let h=d.getHours(),amp=h>=12?'PM':'AM';h=h%12||12;return `${d.getDate()} ${months[d.getMonth()]} · ${h}:${String(d.getMinutes()).padStart(2,'0')} ${amp}`}
function ensureStrip(){let el=document.getElementById('officialLiveStrip');if(el)return el;const top=document.querySelector('.top');if(!top)return null;el=document.createElement('div');el.id='officialLiveStrip';el.className='official-live-strip';el.innerHTML='<span class="live-label">LIVE</span><span>Report Through<br><b id="officialReportThrough">—</b></span><span>Last Updated<br><b id="officialLastUpdated">—</b></span><span>Next Scheduled Update<br><b id="officialNextUpdate">—</b></span>';top.insertAdjacentElement('afterend',el);return el}
function rememberUpdate(){const fp=fingerprint();if(!fp||/^\|/.test(fp))return;const old=localStorage.getItem(FP_KEY)||'';if(fp!==old){localStorage.setItem(FP_KEY,fp);if(window.__otsLastUpdatedAt)localStorage.setItem(LAST_KEY,window.__otsLastUpdatedAt);else localStorage.setItem(LAST_KEY,new Date().toISOString())}}
function render(){if(!ensureStrip())return;rememberUpdate();const t=document.getElementById('officialReportThrough'),u=document.getElementById('officialLastUpdated'),n=document.getElementById('officialNextUpdate');if(t)t.textContent=fmtDate(snapshot());const stamp=window.__otsLastUpdatedAt||localStorage.getItem(LAST_KEY)||'';if(u)u.textContent=fmtStamp(stamp);if(n)n.textContent=nextSchedule();const mode=document.getElementById('modeLabel');if(mode)mode.textContent='LIVE REPORT STATUS'}
setInterval(render,1000);setTimeout(render,50);setTimeout(render,800);setTimeout(render,2500);
})();
