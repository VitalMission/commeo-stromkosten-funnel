(function(){
  // v2: the earlier consent only covered the Meta Pixel. Google Ads was added
  // later, so everyone is asked again rather than reusing a narrower yes.
  const key = 'commeo_cookie_consent_v2';
  const scripts = ['/tracking.js?v=2','/google-ads.js?v=3'];

  function notify(value){
    window.dispatchEvent(new CustomEvent('commeo:marketing-consent',{detail:{value}}));
  }

  function loadScript(src){
    return new Promise(resolve => {
      if(document.querySelector(`script[src="${src}"]`)) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = resolve;
      document.head.appendChild(script);
    });
  }

  // Notify once both tags are defined, so danke.js fires the conversion on both.
  function loadMarketing(){
    Promise.all(scripts.map(loadScript)).then(() => notify('accepted'));
  }

  function removeMarketingCookies(){
    ['_fbp','_fbc','_gcl_au','_gcl_aw','_gcl_dc'].forEach(name => {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.${location.hostname}; SameSite=Lax`;
    });
  }

  function closeBanner(){
    document.querySelector('.cookie-banner')?.remove();
    document.querySelector('.cookie-backdrop')?.remove();
  }

  function choose(value){
    localStorage.setItem(key,value);
    closeBanner();
    if(value === 'accepted') loadMarketing();
    else {
      removeMarketingCookies();
      notify('rejected');
    }
  }

  function showBanner(){
    closeBanner();
    const backdrop = document.createElement('div');
    backdrop.className = 'cookie-backdrop';
    const banner = document.createElement('section');
    banner.className = 'cookie-banner';
    banner.setAttribute('role','dialog');
    banner.setAttribute('aria-modal','true');
    banner.setAttribute('aria-labelledby','cookie-title');
    banner.innerHTML = `
      <div class="cookie-copy">
        <p class="section-label">Datenschutz-Einstellungen</p>
        <h2 id="cookie-title">Dürfen wir die Nutzung dieser Seite messen?</h2>
        <p>Wir verwenden den Meta Pixel und das Conversion-Tracking von Google Ads, um Kampagnen auszuwerten und den Funnel zu verbessern. Beide werden erst nach Ihrer Zustimmung geladen. Notwendige Funktionen des Potenzial-Checks funktionieren auch ohne Marketing-Cookies.</p>
        <a href="https://www.commeo.com/datenschutz/" target="_blank" rel="noopener">Mehr zum Datenschutz</a>
      </div>
      <div class="cookie-actions">
        <button type="button" class="btn cookie-accept">Alle akzeptieren</button>
        <button type="button" class="cookie-reject">Nur notwendige</button>
      </div>`;
    document.body.append(backdrop,banner);
    banner.querySelector('.cookie-accept').addEventListener('click',()=>choose('accepted'));
    banner.querySelector('.cookie-reject').addEventListener('click',()=>choose('rejected'));
    banner.querySelector('.cookie-accept').focus();
  }

  function addSettingsButton(){
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cookie-settings';
    button.textContent = 'Cookie-Einstellungen';
    button.addEventListener('click',showBanner);
    document.body.appendChild(button);
  }

  function init(){
    addSettingsButton();
    const consent = localStorage.getItem(key);
    if(consent === 'accepted') loadMarketing();
    else if(consent !== 'rejected') showBanner();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
