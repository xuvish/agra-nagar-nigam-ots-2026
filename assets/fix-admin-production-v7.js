(function(){
'use strict';
const ADMIN_USER='9997096978';
const ADMIN_PASS_SHA256='b2fceabfa728f3cdc62522420cba0bb830406ab22af435292241d3d25f0f4bba';
const AUTH_KEY='ots_admin_session_v1';
const ORIGINAL_OPEN=window.openReports;
const ORIGINAL_PROCESS=window.processReportSet||window.processWorkbook;
async function sha256(text){const data=new TextEncoder().encode(text);const buf=await crypto.subtle.digest('SHA-256',data);return[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function modal(){
 let m=document.getElementById('adminLoginModal');if(m)return m;
 m=document.createElement('div');m.id='adminLoginModal';m.className='modal';
 m.innerHTML='<div class="modalbox" style="max-width:520px"><div style="display:flex;justify-content:space-between;gap:12px"><div><h2 style="margin:0;font-size:20px">Administrator Login</h2><p style="color:#7896aa;font-size:11px;margin:5px 0 0">Report upload access is restricted. Dashboard viewing remains public.</p></div><button class="btn" id="adminClose">✕</button></div><form id="adminLoginForm" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px"><input class="control" id="adminUser" autocomplete="username" inputmode="numeric" placeholder="Username" required><input class="control" id="adminPass" type="password" autocomplete="current-password" placeholder="Password" required><div id="adminLoginMsg" class="msg" style="grid-column:1/-1"></div><div style="grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px"><button class="btn" type="button" id="adminCancel">Cancel</button><button class="btn primary" type="submit">Login & Open Reports</button></div></form></div>';
 document.body.appendChild(m);const close=()=>m.classList.remove('on');m.querySelector('#adminClose').onclick=close;m.querySelector('#adminCancel').onclick=close;
 m.querySelector('#adminLoginForm').onsubmit=async e=>{e.preventDefault();const u=m.querySelector('#adminUser').value.trim(),p=m.querySelector('#adminPass').value,msg=m.querySelector('#adminLoginMsg');if(u===ADMIN_USER&&await sha256(p)===ADMIN_PASS_SHA256){sessionStorage.setItem(AUTH_KEY,'1');window.__otsAdminCred={username:u,password:p};msg.className='msg show ok';msg.textContent='Access granted.';setTimeout(()=>{close();ORIGINAL_OPEN();enhance()},120)}else{msg.className='msg show err';msg.textContent='Invalid username or password.'}};
 return m;
}
function enhance(){
 const rm=document.getElementById('reportModal');if(!rm)return;const p=rm.querySelector('.modalbox p');if(p)p.textContent='Select exactly seven OTS reports. Report type is recognized from report content, not filename.';
 let box=document.getElementById('productionFileStatus');if(!box){box=document.createElement('div');box.id='productionFileStatus';box.className='notice';box.style.marginTop='10px';rm.querySelector('.drop')?.insertAdjacentElement('afterend',box)}
 const input=document.getElementById('masterFile');const refresh=()=>{const count=input?.files?.length||0;box.textContent=count===7?'7 files selected · ready for content recognition and reconciliation.':count+' file(s) selected · choose exactly 7 OTS reports.';const b=rm.querySelector('.btn.primary');if(b)b.disabled=count!==7};if(input&&!input.dataset.prodAdmin){input.dataset.prodAdmin='1';input.addEventListener('change',refresh)}refresh();
}
window.openReports=function(){const m=modal();if(sessionStorage.getItem(AUTH_KEY)==='1'&&window.__otsAdminCred?.password){ORIGINAL_OPEN();enhance();return}sessionStorage.removeItem(AUTH_KEY);m.classList.add('on');setTimeout(()=>m.querySelector('#adminUser')?.focus(),50)};
window.processReportSet=async function(){if(sessionStorage.getItem(AUTH_KEY)!=='1'){window.openReports();return}const files=[...(document.getElementById('masterFile')?.files||[])];if(files.length!==7){window.uploadMessage?.('Please select exactly 7 OTS reports together.',false);return}return await ORIGINAL_PROCESS.apply(this,arguments)};
window.processWorkbook=window.processReportSet;
modal();enhance();
})();