(function(){
'use strict';
const FLAG='ots_production_v7_reset_done';
if(localStorage.getItem(FLAG)==='1')return;
[
 'ots_shared_snapshot_cache_v2',
 'ots_official_last_updated_v2',
 'ots_official_last_fingerprint_v2'
].forEach(k=>localStorage.removeItem(k));
try{indexedDB.deleteDatabase('AgraOTSNexus')}catch(e){}
localStorage.setItem(FLAG,'1');
})();