(function(){
'use strict';
function ensure(){
 const m=document.getElementById('drillModal');if(!m)return;
 const head=m.querySelector('.drill-head'),close=head?.querySelector('.drill-close');if(!head||document.getElementById('drillHeadActions'))return;
 const a=document.createElement('div');a.id='drillHeadActions';a.className='drill-head-actions';
 if(close)head.insertBefore(a,close);else head.appendChild(a);
}
ensure();
new MutationObserver(ensure).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',()=>setTimeout(ensure,100));
})();