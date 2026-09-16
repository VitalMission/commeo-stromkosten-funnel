const pendingLead = sessionStorage.getItem('commeo_lead_pending');

if(pendingLead){
  try{
    const lead = JSON.parse(pendingLead);
    document.querySelector('#resultLabel').textContent = lead.label;
    document.querySelector('#resultTitle').textContent = lead.title;
    document.querySelector('#resultCopy').textContent = lead.copy;

    if(!sessionStorage.getItem('commeo_lead_fired')){
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event:'lead',
        funnel:'commeo_stromkosten',
        lead_score:lead.score,
        lead_tier:lead.tier,
        ...lead.campaign
      });
      if(typeof window.fbq === 'function'){
        window.fbq('track','Lead',{
          content_name:'Commeo Stromkosten Potenzialanalyse',
          lead_tier:lead.tier,
          lead_score:lead.score
        });
      }
      sessionStorage.setItem('commeo_lead_fired','1');
    }
    sessionStorage.removeItem('commeo_lead_pending');
  }catch(error){
    sessionStorage.removeItem('commeo_lead_pending');
  }
}

