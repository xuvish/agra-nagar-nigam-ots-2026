/* Small launcher only. Government credentials are entered into the local helper iframe,
   never read by this public GitHub Pages script. */
(function(){
 'use strict';
 const LOCAL='http://127.0.0.1:8765/control';
 let overlay=null,trigger=null;
 function close(){if(!overlay)return;overlay.hidden=true;if(trigger?.isConnected)trigger.focus()}
 function ensure(){
  if(overlay)return;
  overlay=document.createElement('div');
  overlay.id='otsAutoUpdateOverlay';overlay.hidden=true;
  overlay.innerHTML=[
    '<section class="ots-auto-dialog" role="dialog" aria-modal="true" aria-labelledby="otsAutoTitle">',
      '<header class="ots-auto-head"><div><h2 id="otsAutoTitle">Update Dashboard</h2><p>Authorized OTS login · 7 reports · live recalculation</p></div><button id="otsAutoClose" type="button" aria-label="Close update window">×</button></header>',
      '<div class="ots-auto-local"><span class="ots-auto-dot" aria-hidden="true"></span><span>Your credentials stay in the local Mac/Windows helper; this website cannot read them.</span></div>',
      '<iframe id="otsAutoLocalFrame" title="Local OTS automation login and live progress" loading="lazy" referrerpolicy="no-referrer" src="about:blank"></iframe>',
      '<div class="ots-auto-foot"><p>One-time setup on your computer: <code>npm run setup</code>. Each working session: <code>npm run bridge</code> in the repository’s <code>automation</code> folder. Complete any portal CAPTCHA/OTP in the official browser window. If the embedded helper is blocked, use the link below.</p><a href="'+LOCAL+'" target="_blank" rel="noopener noreferrer">Open local helper ↗</a></div>',
    '</section>'
  ].join('');
  document.body.appendChild(overlay);
  overlay.querySelector('#otsAutoClose').addEventListener('click',close);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)close()});
 }
 function open(e){
  ensure();
  trigger=e?.currentTarget||document.activeElement;
  overlay.hidden=false;
  const frame=overlay.querySelector('#otsAutoLocalFrame');
  if(frame.src!==LOCAL)frame.src=LOCAL;
  overlay.querySelector('#otsAutoClose').focus();
 }
 function mount(){
  const bar=document.querySelector('.top .actions');
  if(!bar||document.getElementById('otsAutoUpdateButton'))return;
  const button=document.createElement('button');
  button.id='otsAutoUpdateButton';button.type='button';button.className='btn ots-auto-top-button';
  button.textContent='↻ Update Dashboard';
  button.addEventListener('click',open);
  const manage=bar.querySelector('.btn.primary');
  if(manage)bar.insertBefore(button,manage);
  else bar.appendChild(button);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
 window.addEventListener('load',mount);
})();
