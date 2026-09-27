/* LiRo GO v62 – produktion utan demo/fejkdata.
   Stoppar automatisk demo-seedning och rensar endast den kända demo-kunden
   och de två demo-jobb som äldre versioner skapade. */
(function(){
  if(window._liroNoDemoV62) return;
  window._liroNoDemoV62=true;

  // Stoppa framtida automatisk seedning så snart overlayn är laddad.
  try{
    seedDemoIfEmpty=async function(){ return; };
  }catch(_){ }

  async function cleanupKnownDemoV62(){
    try{
      if(typeof dbAll!=='function' || typeof dbDel!=='function') return;

      const allJobs=await dbAll('jobs');
      const allCustomers=await dbAll('customers');
      const demoCustomer=allCustomers.find(c=>
        c && c.name==='Karlssons Fastigheter AB' &&
        c.phone==='070-123 45 67' &&
        c.address==='Industrivägen 12' &&
        c.city==='Göteborg'
      );
      if(!demoCustomer) return;

      const demoTitles=new Set(['Felsökning elcentral','Installation laddbox']);
      const linked=allJobs.filter(j=>j && j.customerId===demoCustomer.id);
      const onlyKnownDemoJobs=linked.length>0 && linked.every(j=>demoTitles.has(j.title));
      if(!onlyKnownDemoJobs) return; // säkerhet: rör inte kunden om andra jobb finns kopplade.

      for(const j of linked){ await dbDel('jobs',j.id); }
      await dbDel('customers',demoCustomer.id);

      if(Array.isArray(jobs)) jobs=jobs.filter(j=>!linked.some(d=>d.id===j.id));
      if(Array.isArray(customers)) customers=customers.filter(c=>c.id!==demoCustomer.id);
      if(typeof render==='function') render();
    }catch(err){
      console.warn('Kunde inte rensa gammal demodata',err);
    }
  }

  // Kör efter att huvudappens IndexedDB-laddning hunnit bli klar.
  if(document.readyState==='complete') setTimeout(cleanupKnownDemoV62,0);
  else window.addEventListener('load',()=>setTimeout(cleanupKnownDemoV62,0),{once:true});
})();