const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('barcode-v96.js','utf8');
const rows=[['1500136',0,'st','Testprodukt'],['0000220',0,'st','Nollprefix']];
let nextFrame,closed=0,message='';
const context={
  window:{},URL,Set,performance:{now:()=>0},
  st:{scannerOpen:true},scannerFrame:null,scannerStream:null,
  document:{
    createElement:()=>({style:{},getContext:()=>({drawImage(){}})}),
    head:{appendChild(){}},addEventListener(){},
    getElementById:()=>({set textContent(value){message=value;},style:{}})
  },
  catalogRow:code=>rows.find(row=>row[0]===code),
  searchCatalog:()=>[['9999999',0,'st','False fuzzy hit']],
  ensureCatalog:async()=>{},
  closeBarcodeScanner(){closed++;context.st.scannerOpen=false;},
  requestAnimationFrame:callback=>{nextFrame=callback;return 1;},
  cancelAnimationFrame(){},setTimeout:callback=>callback(),console
};
vm.createContext(context);
vm.runInContext(source.replace('  openBarcodeScanner=async function(){','  window.testLoop=scanLoopV96;\n  openBarcodeScanner=async function(){'),context);
(async()=>{
  assert.equal((await context.window.resolveBarcodeV110('1500136E')).code,'1500136');
  assert.equal((await context.window.resolveBarcodeV110('220')).code,'0000220');
  assert.equal((await context.window.resolveBarcodeV110('https://example.test/product?artnr=1500136')).code,'1500136');
  assert.equal((await context.window.resolveBarcodeV110('7312345678901')).matched,false);
  assert.equal((await context.window.resolveBarcodeV110('1500')).matched,false,'Prefix search must not choose an arbitrary product');
  assert.equal(await context.window.applyBarcodeV96('7312345678901',true),false);
  assert.equal(closed,0,'Unknown live code must keep camera open');
  assert(message.includes('saknar artikelträff'));
  const video={videoWidth:100,videoHeight:100,readyState:2};
  const detector={detect:async()=>[{rawValue:'https://example.test/info'},{rawValue:'1500136E'}]};
  context.window.testLoop(video,detector);
  await nextFrame(500);assert.equal(closed,0,'Ignore startup detections');
  await nextFrame(1000);await nextFrame(1200);await nextFrame(1400);
  assert.equal(closed,0,'Do not close on a brief or unstable read');
  await nextFrame(1600);
  assert.equal(closed,1,'Stable known article closes scanner once');
  assert.equal(context.st.matSearch,'1500136');
  // EAN lookup must coexist with exact matching and the confirmation step.
  let confirmations=0;
  context.window.LiRoBarcodeLookup={
    normalizeGtin:code=>code==='7312345678901'?'07312345678901':null,
    resolve:async()=>({eNumber:'1500136',gtin:'07312345678901'}),
    confirmMaterial:async row=>{assert.equal(row[0],'1500136');confirmations++;}
  };
  assert.equal((await context.window.resolveBarcodeV110('7312345678901')).code,'1500136');
  context.st.scannerOpen=true;
  assert.equal(await context.window.applyBarcodeV96('7312345678901',true),true);
  assert.equal(confirmations,1,'Known EAN opens material confirmation');
  context.st.scannerOpen=true;
  context.window.LiRoBarcodeLookup.resolve=async()=>{throw new Error('Lookup unavailable');};
  const closedBeforeFailure=closed;
  assert.equal(await context.window.applyBarcodeV96('7312345678901',true),false);
  assert.equal(closed,closedBeforeFailure,'Lookup failure keeps camera open');
  assert.equal(message,'Lookup unavailable');
  console.log('Scanner regression OK: stable reads, unknown codes, exact match, QR article and leading zero');
})().catch(error=>{console.error(error);process.exitCode=1;});
