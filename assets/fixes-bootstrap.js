(function(){
  function load(src,done){
    const s=document.createElement('script');
    s.src=src;
    s.onload=done;
    s.onerror=()=>console.error('Failed to load',src);
    document.body.appendChild(s);
  }
  load('assets/fix-excel-date-local.js?v=20260917-2340-v1',()=>
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
                  if(submit){submit.onclick=window.processReportSet;submit.textContent='Submit Reports & Recalculate';}
                }
                load('assets/fix-point7.js?v=20260917-0830',()=>
                  load('assets/fix-engine-v3.js?v=20260917-1205',()=>
                    load('assets/fix-point8.js?v=20260917-1145',()=>{
                      if(typeof window.processReportSet==='function'){
                        window.processWorkbook=window.processReportSet;
                        const submit=document.querySelector('#reportModal .btn.primary');if(submit)submit.onclick=window.processReportSet;
                      }
                      load('assets/fix-admin-live.js?v=20260917-1310',()=>
                        load('assets/fix-smart-upload.js?v=20260917-1722',()=>
                          load('assets/fix-tight-mapper.js?v=20260917-2010-v2',()=>
                            load('assets/fix-source-authority.js?v=20260917-2335-v1',()=>
                              load('assets/fix-unresolved-allocation.js?v=20260917-2025-v1',()=>
                                load('assets/fix-multi-report-intelligence.js?v=20260917-2350-v1',()=>
                                  load('assets/fix-followup-contact-safety.js?v=20260917-2352-v1',()=>
                                    load('assets/fix-intelligence-local-bridge.js?v=20260918-0042-calling-mobile-v3',()=>
                                      load('assets/fix-shared-live.js?v=20260918-0438-shared-v3',()=>
                                        load('assets/fix-property-contact-master.js?v=20260918-0124-v2-multimobile',()=>
                                          load('assets/fix-property-contact-multiformat.js?v=20260918-0132-v1',()=>
                                            load('assets/fix-property-master-main-uploader.js?v=20260918-0152-direct-v2',()=>
                                              load('assets/fix-final-dashboard-integrity.js?v=20260918-0438-integrity-v1',()=>{
                                                window.__OTS_BOOTSTRAP_READY=true;
                                                window.processWorkbook=window.processReportSet;
                                                if(window.renderAll)window.renderAll();
                                                document.dispatchEvent(new CustomEvent('ots:bootstrap-ready'));
                                              })
                                            )
                                          )
                                        )
                                      )
                                    )
                                  )
                                )
                              )
                            )
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
    })
  );
})();