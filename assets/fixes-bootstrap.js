(function(){
  function load(src,done){
    const s=document.createElement('script');
    s.src=src;
    s.onload=done;
    s.onerror=()=>console.error('Failed to load',src);
    document.body.appendChild(s);
  }
  load('assets/fix-point1.js?v=20260917-0900',()=>{
    let tries=0;
    const wait=setInterval(()=>{
      tries++;
      if(window.openClassification||tries>80){
        clearInterval(wait);
        load('assets/fix-point4.js?v=20260917-0900',()=>
          load('assets/fix-point5.js?v=20260917-0900',()=>
            load('assets/fix-point6.js?v=20260917-0901',()=>{
              if(typeof window.processReportSet==='function'){
                window.processWorkbook=window.processReportSet;
                const submit=document.querySelector('#reportModal .btn.primary');
                if(submit){
                  submit.onclick=window.processReportSet;
                  submit.textContent='Submit Reports & Recalculate';
                }
              }
              load('assets/fix-point7.js?v=20260917-0830',()=>
                load('assets/fix-engine-v3.js?v=20260917-1205',()=>
                  load('assets/fix-point8.js?v=20260917-1145',()=>{
                    if(typeof window.processReportSet==='function'){
                      window.processWorkbook=window.processReportSet;
                      const submit=document.querySelector('#reportModal .btn.primary');
                      if(submit) submit.onclick=window.processReportSet;
                    }
                    load('assets/fix-admin-live.js?v=20260917-1310',()=>
                      load('assets/fix-smart-upload.js?v=20260917-1722',()=>
                        load('assets/fix-tight-mapper.js?v=20260917-2010-v2',()=>
                          load('assets/fix-shared-live.js?v=20260917-1730',()=>{
                            window.processWorkbook=window.processReportSet;
                            const submit=document.querySelector('#reportModal .btn.primary');
                            if(submit) submit.onclick=window.processReportSet;
                            if(window.renderAll) window.renderAll();
                          })
                        )
                      )
                    );
                  })
                )
              );
            })
          )
        );
      }
    },50);
  });
})();