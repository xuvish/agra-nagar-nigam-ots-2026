(function(){
'use strict';
let started=false;
function load(src,done){
 const s=document.createElement('script');s.src=src;s.async=false;
 s.onload=done;s.onerror=()=>{console.error('Officer UI load failed',src);done&&done()};
 document.body.appendChild(s);
}
function reveal(){
 try{if(typeof window.renderAll==='function')window.renderAll()}catch(e){console.warn(e)}
 setTimeout(()=>{document.body.classList.remove('ots-booting');document.body.classList.add('ots-ready');const l=document.getElementById('otsBootLoader');if(l)l.setAttribute('aria-hidden','true')},120);
}
function start(){
 if(started)return;started=true;
 load('assets/executive-dashboard.js?v=20260918-0715-ui-v6',()=>
  load('assets/executive-paymentdone.js?v=20260918-0715-ui-v6',()=>{
   window.__OFFICER_UI_ACTIVE=true;
   load('assets/singlepage-interactive.js?v=20260918-0715-ui-v6',()=>
    load('assets/officer-modal-actions-v1.js?v=20260918-0715-ui-v6',()=>
     load('assets/officer-polish-v5.js?v=20260918-0715-ui-v6',reveal)
    )
   );
  })
 );
}
if(window.__OTS_BOOTSTRAP_READY)start();
document.addEventListener('ots:bootstrap-ready',start,{once:true});
let waits=0;const t=setInterval(()=>{waits++;if(window.__OTS_BOOTSTRAP_READY){clearInterval(t);start()}else if(waits>160){clearInterval(t);start()}},75);
})();