(function(){
  const key = 'commeo_cookie_consent';
  const pixelSrc = '/tracking.js?v=2';

  function notify(value){
    window.dispatchEvent(new CustomEvent('commeo:marketing-consent',{detail:{value}}));
  }

  function loadPixel(){
    if(document.querySelector(`script[src="${pixelSrc}"]`)){
      if(typeof window.fbq === 'function') notify('accepted');
      return;
    }
    const script = document.createElement('script');
    script.src = pixelSrc;
    script.async = true;
    script.onload = () => notify('accepted');
    document.head.appendChild(script);
  }

  function removeMetaCookies(){
    ['_fbp','_fbc'].forEach(name => {
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
    if(value === 'accepted') loadPixel();
    else {
      removeMetaCookies();
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
        <p>Wir verwenden den Meta Pixel, um Kampagnen auszuwerten und den Funnel zu verbessern. Er wird erst nach Ihrer Zustimmung geladen. Notwendige Funktionen des Potenzial-Checks funktionieren auch ohne Marketing-Cookies.</p>
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
    if(consent === 'accepted') loadPixel();
    else if(consent !== 'rejected') showBanner();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
