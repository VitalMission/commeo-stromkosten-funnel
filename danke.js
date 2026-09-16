const pendingLead = sessionStorage.getItem('commeo_lead_pending');
let leadData = null;

function fireLead(){
  if(!leadData || sessionStorage.getItem('commeo_lead_fired') || typeof window.fbq !== 'function') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event:'lead',
    funnel:'commeo_stromkosten',
    lead_score:leadData.score,
    lead_tier:leadData.tier,
    ...leadData.campaign
  });
  window.fbq('track','Lead',{
    content_name:'Commeo Stromkosten Potenzialanalyse',
    lead_tier:leadData.tier,
    lead_score:leadData.score
  });
  sessionStorage.setItem('commeo_lead_fired','1');
  sessionStorage.removeItem('commeo_lead_pending');
}

if(pendingLead){
  try{
    leadData = JSON.parse(pendingLead);
    document.querySelector('#resultLabel').textContent = leadData.label;
    document.querySelector('#resultTitle').textContent = leadData.title;
    document.querySelector('#resultCopy').textContent = leadData.copy;
    fireLead();
  }catch(error){
    sessionStorage.removeItem('commeo_lead_pending');
  }
}

window.addEventListener('commeo:marketing-consent',event => {
  if(event.detail?.value === 'accepted') fireLead();
});
