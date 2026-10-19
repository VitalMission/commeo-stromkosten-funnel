const pendingLead = sessionStorage.getItem('commeo_lead_pending');
let leadData = null;

function fireLead(){
  if(!leadData || sessionStorage.getItem('commeo_lead_fired')) return;
  if(typeof window.fbq !== 'function' && typeof window.gtag !== 'function') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event:'lead',
    funnel:'commeo_stromkosten',
    lead_score:leadData.score,
    lead_tier:leadData.tier,
    ...leadData.campaign
  });
  if(typeof window.fbq === 'function'){
    window.fbq('track','Lead',{
      content_name:'Commeo Stromkosten Potenzialanalyse',
      lead_tier:leadData.tier,
      lead_score:leadData.score
    });
  }
  const ads = window.commeoGoogleAds;
  // One Google conversion per lead: A/B count as "Qualified Lead", C as "Lead".
  const qualified = ads?.qualifiedLabel && ads.qualifiedTiers?.includes(leadData.tier);
  const label = qualified ? ads.qualifiedLabel : ads?.leadLabel;
  if(typeof window.gtag === 'function' && label){
    window.gtag('event','conversion',{send_to:`${ads.id}/${label}`});
  }
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
