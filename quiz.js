const steps = [
  {
    short:'Betrieb',
    q:'Für welchen Standort prüfen Sie das Einsparpotenzial?',
    hint:'Die Analyse richtet sich ausschließlich an Gewerbe- und Industriebetriebe.',
    answers:['Produktion / Industrie','Logistik / Lager','Handel / größeres Gewerbe','Hotel / Gastronomie','Immobilie / Quartier','Privathaushalt']
  },
  {
    short:'Energieprofil',
    q:'Wie sieht Ihr aktuelles Energieprofil aus?',
    hint:'Zwei kurze Angaben helfen uns, das wirtschaftliche Potenzial einzuordnen.',
    groups:[
      {key:'cost',title:'Monatliche Stromkosten',answers:['Unter 2.000 €','2.000 – 5.000 €','5.000 – 10.000 €','10.000 – 25.000 €','Über 25.000 €','Nicht sicher']},
      {key:'lever',title:'Größter Kostenhebel',multiple:true,answers:['Hohe Lastspitzen / Leistungspreise','Hoher Stromverbrauch insgesamt','PV-Überschüsse bleiben ungenutzt','Neue Ladeinfrastruktur ist geplant','Schwankende Strompreise','Noch nicht eindeutig']}
    ]
  },
  {
    short:'Projekt',
    q:'Wie konkret ist Ihr Vorhaben?',
    hint:'Zeitraum und Investitionsstatus zeigen uns, wie schnell der nächste Schritt sinnvoll ist.',
    groups:[
      {key:'timeline',title:'Gewünschter Zeitraum',answers:['Innerhalb von 3 Monaten','In 3 bis 6 Monaten','In 6 bis 12 Monaten','Später als 12 Monate','Zunächst Potenzial verstehen']},
      {key:'investment',title:'Stand der Entscheidung',answers:['Budget / Business Case ist grundsätzlich freigegeben','Budget und Anforderungen werden aktuell definiert','Wir benötigen belastbare Zahlen für die Entscheidung']}
    ]
  },
  {
    short:'Passung',
    q:'Wer treibt das Projekt – und welche Daten liegen vor?',
    hint:'Damit kann Commeo Ihre Anfrage auf der richtigen Ebene und mit der passenden Detailtiefe prüfen.',
    groups:[
      {key:'role',title:'Ihre Rolle',answers:['Geschäftsführung / Inhaber','Technische Leitung / Energiemanagement','Einkauf / Finanzen','Projektverantwortung','Beratung / Planung','Keine direkte Projektverantwortung']},
      {key:'data',title:'Vorhandene Energiedaten',answers:['Lastgangdaten und aktuelle Stromabrechnung liegen vor','Stromabrechnung liegt vor, Lastgang kann beschafft werden','Daten können kurzfristig zusammengestellt werden','Aktuell liegen noch keine Daten vor']}
    ]
  },
  {
    short:'Kontakt',
    q:'Wohin dürfen wir Ihr Einsparpotenzial senden?',
    hint:'Ein Commeo-Experte prüft Ihre Angaben und ordnet die mögliche Stromkostenreduzierung persönlich in Euro und Prozent ein.',
    form:true
  }
];

let current = 0;
const data = {campaign:JSON.parse(sessionStorage.getItem('commeo_campaign') || '{}'),contact:{}};
const progress = document.querySelector('#progress');
const q = document.querySelector('#question');
const hint = document.querySelector('#hint');
const answers = document.querySelector('#answers');
const fields = document.querySelector('#formFields');
const next = document.querySelector('#next');
const back = document.querySelector('#back');
const label = document.querySelector('#stepLabel');
progress.style.setProperty('--steps',steps.length);

function showRejection(reason){
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({event:'lead_disqualified',funnel:'commeo_stromkosten',reason,...data.campaign});
  progress.innerHTML = '';
  document.querySelector('.quiz-card').innerHTML = `<div class="success rejected"><span>i</span><p class="section-label">Aktuell noch keine passende Ausgangslage</p><h1>Vielen Dank für Ihre Angaben.</h1><p>Commeo-Systeme richten sich aktuell vor allem an Gewerbe- und Industriestandorte mit mindestens etwa 2.000 € Stromkosten pro Monat.</p><button class="back restart" type="button">← Angabe korrigieren</button><a class="btn" href="/">Zurück zur Startseite →</a></div>`;
  document.querySelector('.restart').onclick = () => location.reload();
}

function stepComplete(step,index){
  if(step.form) return Boolean(data[index]);
  if(step.groups) return step.groups.every(group => group.multiple ? data[index]?.[group.key]?.length : data[index]?.[group.key]);
  return Boolean(data[index]);
}

function validateForm(){
  const required = [...fields.querySelectorAll('input[required]')];
  const email = fields.querySelector('input[name="email"]');
  const zip = fields.querySelector('input[name="zip"]');
  const valid = required.every(input => input.type==='checkbox' ? input.checked : input.value.trim())
    && (!email || email.validity.valid)
    && (!zip || /^\d{5}$/.test(zip.value.trim()));
  data[current] = valid;
  next.disabled = !valid;
}

function selectGroup(group,value){
  if(group.multiple){
    const selected = data[current]?.[group.key] || [];
    const isUnsure = value==='Noch nicht eindeutig';
    const nextValues = selected.includes(value)
      ? selected.filter(item => item!==value)
      : isUnsure ? [value] : [...selected.filter(item => item!=='Noch nicht eindeutig'),value];
    data[current] = {...(data[current] || {}),[group.key]:nextValues};
    render();
    return;
  }
  data[current] = {...(data[current] || {}),[group.key]:value};
  if(group.key==='cost' && value==='Unter 2.000 €'){
    showRejection('stromkosten_unter_2000');
    return;
  }
  render();
}

function scoreLead(){
  let score = 0;
  const points = {
    '2.000 – 5.000 €':8,'5.000 – 10.000 €':15,'10.000 – 25.000 €':20,'Über 25.000 €':25,
    'Hohe Lastspitzen / Leistungspreise':8,'PV-Überschüsse bleiben ungenutzt':7,'Neue Ladeinfrastruktur ist geplant':7,
    'Innerhalb von 3 Monaten':18,'In 3 bis 6 Monaten':15,'In 6 bis 12 Monaten':10,
    'Budget / Business Case ist grundsätzlich freigegeben':20,'Budget und Anforderungen werden aktuell definiert':15,'Wir benötigen belastbare Zahlen für die Entscheidung':8,
    'Lastgangdaten und aktuelle Stromabrechnung liegen vor':12,'Stromabrechnung liegt vor, Lastgang kann beschafft werden':9,'Daten können kurzfristig zusammengestellt werden':5,
    'Geschäftsführung / Inhaber':20,'Technische Leitung / Energiemanagement':18,'Einkauf / Finanzen':15,'Projektverantwortung':13,'Beratung / Planung':5
  };
  Object.keys(data).filter(key => /^\d+$/.test(key)).forEach(key => {
    const value = data[key];
    if(value && typeof value==='object') Object.entries(value).forEach(([group,answer]) => {
      if(Array.isArray(answer)) score += Math.min(group==='lever'?12:Infinity,answer.reduce((sum,item)=>sum+(points[item]||0),0));
      else score += points[answer] || 0;
    });
    else score += points[value] || 0;
  });
  return {score,tier:score>=75?'A':score>=45?'B':'C'};
}

function render(){
  const step = steps[current];
  progress.innerHTML = steps.map((item,index)=>`<div class="prog ${index<=current?'active':''}"><i>${index+1}</i><span>${item.short}</span></div>`).join('');
  label.textContent = `Schritt ${current+1} von ${steps.length}`;
  q.textContent = step.q;
  hint.textContent = step.hint;
  answers.innerHTML = '';
  fields.innerHTML = '';
  back.style.visibility = current ? 'visible' : 'hidden';
  next.textContent = current===steps.length-1 ? 'Einsparpotenzial anfordern →' : 'Weiter →';
  next.disabled = !stepComplete(step,current);

  if(step.form){
    fields.innerHTML = `<div class="field-row"><label>Vorname<input name="first" autocomplete="given-name" required></label><label>Nachname<input name="last" autocomplete="family-name" required></label></div><label>Unternehmen<input name="company" autocomplete="organization" required></label><div class="field-row"><label>Geschäftliche E-Mail<input name="email" type="email" autocomplete="email" required></label><label>Telefon für Rückfragen<input name="phone" type="tel" autocomplete="tel" required></label></div><div class="field-row"><label>PLZ des Standorts<input name="zip" inputmode="numeric" autocomplete="postal-code" maxlength="5" pattern="[0-9]{5}" required></label><label>Website <span>(optional)</span><input name="website" type="url" placeholder="https://"></label></div><label class="consent"><input name="consent" type="checkbox" required><span>Ich stimme zu, dass Commeo meine Angaben zur Bearbeitung der Potenzialanalyse und zur persönlichen Kontaktaufnahme verwendet. Hinweise zum Datenschutz habe ich zur Kenntnis genommen.</span></label>`;
    fields.querySelectorAll('input').forEach(input => {
      if(input.type==='checkbox') input.checked = Boolean(data.contact[input.name]);
      else input.value = data.contact[input.name] || '';
      const save = () => {
        data.contact[input.name] = input.type==='checkbox' ? input.checked : input.value;
        validateForm();
      };
      input.addEventListener('input',save);
      input.addEventListener('change',save);
    });
    validateForm();
    return;
  }

  if(step.groups){
    answers.className = 'answer-groups';
    step.groups.forEach(group => {
      const section = document.createElement('section');
      section.className = 'answer-group';
      section.innerHTML = `<h2>${group.title}${group.multiple?'<span>Mehrfachauswahl möglich</span>':''}</h2><div class="group-options"></div>`;
      group.answers.forEach(answer => {
        const button = document.createElement('button');
        const selected = group.multiple ? data[current]?.[group.key]?.includes(answer) : data[current]?.[group.key]===answer;
        button.className = 'answer'+(selected?' selected':'');
        button.setAttribute('aria-pressed',selected?'true':'false');
        button.textContent = answer;
        button.onclick = () => selectGroup(group,answer);
        section.querySelector('.group-options').appendChild(button);
      });
      answers.appendChild(section);
    });
    return;
  }

  answers.className = 'answers';
  step.answers.forEach(answer => {
    const button = document.createElement('button');
    button.className = 'answer'+(data[current]===answer?' selected':'');
    button.textContent = answer;
    button.onclick = () => {
      data[current] = answer;
      if(current===0 && answer==='Privathaushalt') showRejection('privathaushalt');
      else render();
    };
    answers.appendChild(button);
  });
}

next.onclick = () => {
  if(current < steps.length-1){
    current++;
    render();
    return;
  }
  const fit = scoreLead();
  const event = `qualified_lead_${fit.tier.toLowerCase()}`;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    funnel:'commeo_stromkosten',
    lead_score:fit.score,
    lead_tier:fit.tier,
    answers:steps.slice(0,-1).map((step,index)=>({question:step.short,answer:data[index]})),
    ...data.campaign
  });
  const result = fit.tier==='A'
    ? {label:'Sehr hohe Projektpassung',title:'Ihr Projekt passt sehr gut zu Commeo.',copy:'Ihre Angaben zeigen ein konkretes und wirtschaftlich relevantes Projekt. Ein Commeo-Experte priorisiert Ihre Anfrage und meldet sich persönlich bei Ihnen.'}
    : fit.tier==='B'
      ? {label:'Gute Projektpassung',title:'Ihre Ausgangslage ist vielversprechend.',copy:'Ein Commeo-Experte prüft jetzt Ihre Angaben und die stärksten Einsparhebel. Sie erhalten anschließend eine persönliche Einschätzung.'}
      : {label:'Individuelle Prüfung erforderlich',title:'Wir prüfen Ihre Ausgangslage genauer.',copy:'Einige Angaben benötigen eine fachliche Einordnung. Commeo prüft, ob und mit welchem Ansatz ein wirtschaftliches Einsparpotenzial besteht.'};
  sessionStorage.setItem('commeo_lead_pending',JSON.stringify({...result,score:fit.score,tier:fit.tier,campaign:data.campaign}));
  sessionStorage.removeItem('commeo_lead_fired');
  location.href = '/danke.html';
};

back.onclick = () => {
  if(current){
    current--;
    render();
  }
};

render();
