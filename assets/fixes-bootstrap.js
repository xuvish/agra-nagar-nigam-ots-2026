(function(){
  function load(src,done){const s=document.createElement('script');s.src=src;s.onload=done;s.onerror=()=>console.error('Failed to load',src);document.body.appendChild(s)}
  load('assets/fix-point1.js?v=20260917-0900',()=>{
    let tries=0;const wait=setInterval(()=>{tries++;if(window.openClassification||tries>80){clearInterval(wait);load('assets/fix-point4.js?v=20260917-0900',()=>load('assets/fix-point5.js?v=20260917-0900',()=>load('assets/fix-point6.js?v=20260917-0900',()=>load('assets/fix-point7.js?v=20260917-0830'))))}},50)
  })
})();