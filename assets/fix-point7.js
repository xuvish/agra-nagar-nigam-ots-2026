(function(){
  const css=`
  .nexus-select{position:relative;min-width:0;z-index:30}
  .nexus-select.native-hidden>select{position:absolute!important;opacity:0!important;pointer-events:none!important;width:1px!important;height:1px!important;inset:auto!important}
  .nx-trigger{width:100%;height:100%;min-height:43px;border:1px solid rgba(104,236,255,.16);border-radius:14px;background:linear-gradient(180deg,rgba(11,22,42,.94),rgba(7,14,29,.96));color:#eef8ff;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 14px;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.015),0 0 0 rgba(104,236,255,0);transition:.22s ease;font-weight:700;letter-spacing:.01em}
  .nx-trigger:hover,.nexus-select.open .nx-trigger{border-color:rgba(104,236,255,.5);box-shadow:0 0 0 1px rgba(104,236,255,.08),0 0 22px rgba(54,255,209,.08),inset 0 0 20px rgba(104,236,255,.03)}
  .nx-trigger .nx-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .nx-chevron{width:18px;height:18px;display:grid;place-items:center;flex:0 0 auto;transition:transform .22s ease;color:#68ecff}
  .nexus-select.open .nx-chevron{transform:rotate(180deg)}
  .nx-menu{position:absolute;left:0;right:0;top:calc(100% + 8px);padding:8px;border:1px solid rgba(104,236,255,.18);border-radius:16px;background:linear-gradient(180deg,rgba(7,15,31,.98),rgba(4,9,21,.985));backdrop-filter:blur(22px) saturate(145%);-webkit-backdrop-filter:blur(22px) saturate(145%);box-shadow:0 24px 65px rgba(0,0,0,.5),0 0 35px rgba(73,227,255,.09),inset 0 0 0 1px rgba(255,255,255,.018);opacity:0;transform:translateY(-8px) scale(.985);pointer-events:none;transition:opacity .16s ease,transform .2s cubic-bezier(.2,.8,.2,1);max-height:320px;overflow:auto;scrollbar-width:thin;scrollbar-color:#2de0de transparent}
  .nexus-select.open .nx-menu{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}
  .nx-option{position:relative;display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:11px;color:#b9ccda;cursor:pointer;transition:.16s ease;user-select:none}
  .nx-option:before{content:'';width:7px;height:7px;border-radius:50%;border:1px solid rgba(104,236,255,.35);box-shadow:0 0 0 rgba(104,236,255,0);transition:.16s ease}
  .nx-option:hover,.nx-option.focused{color:#f3fbff;background:linear-gradient(90deg,rgba(38,205,255,.11),rgba(54,255,209,.045));transform:translateX(2px)}
  .nx-option.selected{color:#eaffff;background:linear-gradient(90deg,rgba(54,255,209,.14),rgba(104,236,255,.08));box-shadow:inset 0 0 0 1px rgba(104,236,255,.07)}
  .nx-option.selected:before{background:#36ffd1;border-color:#36ffd1;box-shadow:0 0 12px rgba(54,255,209,.75)}
  .nx-scan{position:absolute;inset:0;pointer-events:none;overflow:hidden;border-radius:16px}
  .nx-scan:after{content:'';position:absolute;left:0;right:0;height:1px;top:-2px;background:linear-gradient(90deg,transparent,#68ecff,transparent);opacity:.45;animation:nxscan 2.6s linear infinite}
  @keyframes nxscan{to{transform:translateY(300px)}}
  @media(max-width:700px){.nx-menu{position:fixed;left:14px;right:14px;top:auto;bottom:18px;max-height:55vh;border-radius:20px}.nexus-select.open:after{content:'';position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);z-index:-1}}
  `;
  const st=document.createElement('style');st.id='nexusSelectStyle';st.textContent=css;document.head.appendChild(st);

  function enhance(select){
    if(!select||select.dataset.nx==='1')return;
    select.dataset.nx='1';
    const wrap=document.createElement('div');wrap.className='nexus-select native-hidden';
    select.parentNode.insertBefore(wrap,select);wrap.appendChild(select);
    const trigger=document.createElement('button');trigger.type='button';trigger.className='nx-trigger';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
    const label=document.createElement('span');label.className='nx-label';
    const chev=document.createElement('span');chev.className='nx-chevron';chev.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    trigger.append(label,chev);
    const menu=document.createElement('div');menu.className='nx-menu';menu.setAttribute('role','listbox');menu.innerHTML='<div class="nx-scan"></div>';
    wrap.append(trigger,menu);
    let focusIndex=-1;
    function rebuild(){
      [...menu.querySelectorAll('.nx-option')].forEach(x=>x.remove());
      [...select.options].forEach((o,i)=>{
        const item=document.createElement('div');item.className='nx-option'+(o.selected?' selected':'');item.textContent=o.textContent;item.dataset.value=o.value;item.dataset.index=i;item.setAttribute('role','option');item.setAttribute('aria-selected',o.selected?'true':'false');
        item.onclick=e=>{e.stopPropagation();select.value=o.value;select.dispatchEvent(new Event('change',{bubbles:true}));sync();close()};
        menu.appendChild(item);
      });
      sync();
    }
    function sync(){
      const opt=select.options[select.selectedIndex]||select.options[0];label.textContent=opt?opt.textContent:'Select';
      [...menu.querySelectorAll('.nx-option')].forEach(x=>{const s=x.dataset.value===select.value;x.classList.toggle('selected',s);x.setAttribute('aria-selected',s?'true':'false')});
    }
    function open(){document.querySelectorAll('.nexus-select.open').forEach(x=>{if(x!==wrap)x.classList.remove('open')});wrap.classList.add('open');trigger.setAttribute('aria-expanded','true');focusIndex=Math.max(0,select.selectedIndex);paintFocus()}
    function close(){wrap.classList.remove('open');trigger.setAttribute('aria-expanded','false');focusIndex=-1;paintFocus()}
    function paintFocus(){[...menu.querySelectorAll('.nx-option')].forEach((x,i)=>x.classList.toggle('focused',i===focusIndex))}
    trigger.onclick=e=>{e.stopPropagation();wrap.classList.contains('open')?close():open()};
    trigger.onkeydown=e=>{
      if(['ArrowDown','ArrowUp','Enter',' ','Escape'].includes(e.key))e.preventDefault();
      if(e.key==='Escape'){close();return}
      if(!wrap.classList.contains('open')){if(['ArrowDown','ArrowUp','Enter',' '].includes(e.key))open();return}
      const opts=[...select.options];
      if(e.key==='ArrowDown')focusIndex=Math.min(opts.length-1,focusIndex+1);
      if(e.key==='ArrowUp')focusIndex=Math.max(0,focusIndex-1);
      if(e.key==='Enter'||e.key===' '){const o=opts[focusIndex];if(o){select.value=o.value;select.dispatchEvent(new Event('change',{bubbles:true}));sync();close();return}}
      paintFocus();
    };
    select.addEventListener('change',sync);
    new MutationObserver(rebuild).observe(select,{childList:true,subtree:true,attributes:true,attributeFilter:['selected','disabled']});
    rebuild();
    wrap._nxClose=close;
  }
  document.addEventListener('click',()=>document.querySelectorAll('.nexus-select.open').forEach(x=>x._nxClose&&x._nxClose()));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.nexus-select.open').forEach(x=>x._nxClose&&x._nxClose())});
  enhance(document.getElementById('zone'));
  enhance(document.getElementById('asof'));
})();
