// Google Ads tag (gtag.js). Loaded by consent.js only after the visitor accepts
// marketing cookies, exactly like the Meta Pixel in tracking.js.
//
// Conversion labels come from Google Ads (Goals -> Conversions -> the action ->
// Tag setup -> "Install the tag yourself": the part after the slash in
// send_to 'AW-11362368068/<label>'). An empty label means that conversion is
// not fired yet; danke.js reads them from here.
window.commeoGoogleAds = {
  id: 'AW-11362368068',
  labels: {
    lead: '',          // every submitted Potenzialanalyse
    qualifiedLead: ''  // tier A or B only
  }
};

window.dataLayer = window.dataLayer || [];
window.gtag = function(){ window.dataLayer.push(arguments); };
// Consent Mode v2: this file only ever runs after "Alle akzeptieren".
window.gtag('consent', 'default', {
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
  analytics_storage: 'denied'
});
window.gtag('js', new Date());
window.gtag('config', window.commeoGoogleAds.id);

(function(d){
  const script = d.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${window.commeoGoogleAds.id}`;
  d.head.appendChild(script);
})(document);
