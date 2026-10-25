const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('LiRo updates remove only obsolete LiRo caches and preserve other applications',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8'),handlers={},deleted=[];
 const current=source.match(/const CACHE\s*=\s*'([^']+)'/)[1];
 const retained=[current,'lirogo-catalog-v60','lirogo-export-libs-v63','another-app-offline-v1','unrelated-documents-cache'];
 vm.runInNewContext(source,{URL,console,indexedDB:{},location:{origin:'https://example.test'},self:{location:new URL('https://example.test/LiRo-GO/sw.js'),addEventListener:(event,handler)=>handlers[event]=handler,clients:{claim:async()=>{}},skipWaiting:async()=>{}},caches:{keys:async()=>[...retained,'lirogo-obsolete-test'],delete:async key=>{deleted.push(key);return true;}}});
 let completion;handlers.activate({waitUntil:promise=>completion=promise});await completion;
 assert.deepEqual(deleted,['lirogo-obsolete-test']);
});
