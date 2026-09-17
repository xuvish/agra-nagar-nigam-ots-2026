(function(){
'use strict';
if(!window.XLSX||typeof window.XLSX.read!=='function')return;
if(window.__otsExcelDatePatched)return;
const originalRead=window.XLSX.read.bind(window.XLSX);
window.XLSX.read=function(data,opts){
  const safeOpts={...(opts||{}),cellDates:false};
  return originalRead(data,safeOpts);
};
window.__otsExcelDatePatched=true;
console.log('OTS Excel date parser: serial-date mode active (timezone-safe)');
})();
