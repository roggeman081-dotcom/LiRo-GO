const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const start=html.indexOf("if(a==='set-job-travel-mode')");
const end=html.indexOf("if(a==='toggle-multi-rates')",start);
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const handle=new AsyncFunction('a','b','jobById','st','dbPut','render',html.slice(start,end));
test('selecting the current travel mode leaves the price input in place',async()=>{
 const job={travelMode:'fixed',travelFixedFee:444};let renders=0,writes=0;
 await handle('set-job-travel-mode',{dataset:{mode:'fixed'}},()=>job,{id:'test'},async()=>writes++,()=>renders++);
 assert.equal(renders,0,'an unchanged selection must not asynchronously replace editable inputs');
 assert.equal(writes,0);
});
test('changing travel mode still saves and renders the chosen mode',async()=>{
 const job={travelMode:'fixed',travelFixedFee:444};let renders=0,saved;
 await handle('set-job-travel-mode',{dataset:{mode:'km'}},()=>job,{id:'test'},async(_store,row)=>saved={...row},()=>renders++);
 assert.equal(saved.travelMode,'km');assert.equal(saved.travelFixedFee,444);assert.equal(renders,1);
});
