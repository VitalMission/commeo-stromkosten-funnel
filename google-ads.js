// Google Ads tag (gtag.js). Loaded by consent.js only after the visitor accepts
// marketing cookies, exactly like the Meta Pixel in tracking.js.
//
// The conversion label comes from Google Ads (Goals -> Conversions -> "Lead" ->
// Tag setup -> "Install the tag yourself": the part after the slash in
// send_to 'AW-11362368068/<label>'). danke.js fires it for each submitted
// Potenzialanalyse. Tier A and B leads fire the separate "Qualified Lead (A/B)"
// action (qualifiedLabel) instead; "Lead" now counts only tier C, so each
// submitted lead is one Google conversion, never two.
window.commeoGoogleAds = {
  id: 'AW-11362368068',
  leadLabel: 'm3fCCLL5pIodEMT0_6kq',
  qualifiedLabel: 't9i8CMWfs6IdEMT0_6kq',
  qualifiedTiers: ['A','B']
};

// Google Analytics 4 property. Shares the gtag.js loaded below with Google Ads,
// so it also only runs after "Alle akzeptieren" (on /, /v2, /check.html, /danke.html).
window.commeoGA4 = { id: 'G-T7C56N311H' };

window.dataLayer = window.dataLayer || [];
window.gtag = function(){ window.dataLayer.push(arguments); };
// Consent Mode v2: this file only ever runs after "Alle akzeptieren", and that
// consent now also covers Google Analytics, so analytics_storage is granted.
window.gtag('consent', 'default', {
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
  analytics_storage: 'granted'
});
window.gtag('js', new Date());
window.gtag('config', window.commeoGoogleAds.id);
window.gtag('config', window.commeoGA4.id);

(function(d){
  const script = d.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${window.commeoGoogleAds.id}`;
  d.head.appendChild(script);
})(document);
