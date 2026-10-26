// Commeo Stromkosten-Funnel v2 (/v2): Live-Rechner + Overlay-Quiz, Design „Stromkosten-Rechner v3“ (Figma, 22.10.2026)
const FUNNEL = 'commeo_stromkosten_v2';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const eur = n => new Intl.NumberFormat('de-DE', {maximumFractionDigits: 0}).format(n) + ' €';
const round = n => Math.round(n / 1000) * 1000;

// --- Kampagnen-Attribution (gleiches Schema wie der bestehende Funnel) ---
const params = new URLSearchParams(location.search);
const campaignKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
const fromUrl = Object.fromEntries(campaignKeys.map(k => [k, params.get(k)]).filter(([, v]) => v));
if (Object.keys(fromUrl).length) sessionStorage.setItem('commeo_campaign', JSON.stringify(fromUrl));
const campaign = JSON.parse(sessionStorage.getItem('commeo_campaign') || '{}');

function track(event, extra = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({event, funnel: FUNNEL, ...campaign, ...extra});
}

// --- Live-Rechner ---
// ACHTUNG: Platzhalter-Annahmen. Müssen vor Livegang von Commeo fachlich freigegeben werden.
const MODEL = {
  base: [0.06, 0.11],                                           // smarter Strombezug / Grundoptimierung
  peaks: {ja: [0.05, 0.09], unsicher: [0.02, 0.05], nein: [0, 0.01]},
  pv: {ueberschuss: [0.03, 0.06], ja: [0.01, 0.03], nein: [0, 0]},
  cap: 0.3
};
// Lastspitzen: Ja/Nein-Umschalter ohne Vorauswahl. Bis jemand klickt, wird mit „unsicher“ gerechnet.
const calc = {cost: 8000, peaks: 'unsicher', pv: 'nein'};

function estimate() {
  const annual = calc.cost * 12;
  const parts = [
    {key: 'peak', label: 'Peak Shaving', r: MODEL.peaks[calc.peaks]},
    {key: 'pv', label: 'PV-Eigenverbrauch', r: MODEL.pv[calc.pv]},
    {key: 'grid', label: 'Smarter Strombezug', r: MODEL.base}
  ];
  const lo = Math.min(parts.reduce((s, p) => s + p.r[0], 0), MODEL.cap);
  const hi = Math.min(parts.reduce((s, p) => s + p.r[1], 0), MODEL.cap);
  return {annual, lo, hi, loEur: round(annual * lo), hiEur: round(annual * hi), parts};
}

function renderCalc() {
  const e = estimate();
  $('#costOut').textContent = calc.cost >= 60000 ? '60.000 €+' : eur(calc.cost);
  $('#saveRange').textContent = `${eur(e.loEur)} – ${eur(e.hiEur)}`;
  $('#savePct').textContent = `etwa ${Math.round(e.lo * 100)} – ${Math.round(e.hi * 100)} % Ihrer Stromkosten`;
  const total = e.parts.reduce((s, p) => s + (p.r[0] + p.r[1]) / 2, 0) || 1;
  const shown = e.parts.filter(p => p.r[1] > 0);
  $('#bars').innerHTML = shown.map(p => `<i class="bar-${p.key}" style="flex:${((p.r[0] + p.r[1]) / 2 / total).toFixed(3)}"></i>`).join('');
  $('#barLegend').innerHTML = shown.map(p => `<li><i class="bar-${p.key}"></i>${p.label}</li>`).join('');
  const range = $('#cost');
  range.style.setProperty('--fill', ((calc.cost - range.min) / (range.max - range.min) * 100) + '%');
}

let calcTracked = false;
function calcTouched() {
  if (!calcTracked) { calcTracked = true; track('calculator_interaction'); }
}
$('#cost').addEventListener('input', e => { calc.cost = Number(e.target.value); renderCalc(); calcTouched(); });
$$('.seg').forEach(seg => seg.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  $$('button', seg).forEach(b => { b.classList.toggle('on', b === btn); b.setAttribute('aria-pressed', b === btn); });
  calc[seg.dataset.key] = btn.dataset.v;
  renderCalc();
  calcTouched();
}));
renderCalc();

// --- Quiz ---
// Antworttexte, Datenstruktur, Scoring, /api/lead und /danke.html sind 1:1 vom bestehenden
// Funnel (/check.html + quiz.js) übernommen, damit Server-Score, Admin, Google Ads und Meta
// unverändert funktionieren. Nur die Darstellung ist neu (eine Frage pro Screen).
function costBucket(c) {
  if (c < 5000) return '2.000 – 5.000 €';
  if (c < 10000) return '5.000 – 10.000 €';
  if (c < 25000) return '10.000 – 25.000 €';
  return 'Über 25.000 €';
}

// slot/key = Position im Antwort-Objekt des alten Funnels: {0:Betrieb, 1:{cost,lever[]}, 2:{timeline,investment}, 3:{role,data}}
const steps = [
  {slot: 0, q: 'Für welchen Standort prüfen Sie?', answers: ['Produktion / Industrie', 'Logistik / Lager', 'Handel / größeres Gewerbe', 'Hotel / Gastronomie', 'Immobilie / Quartier', 'Privathaushalt'], reject: {'Privathaushalt': 'privathaushalt'}},
  {slot: 1, key: 'cost', q: 'Wie hoch sind Ihre Stromkosten pro Monat?', hint: 'Aus dem Rechner übernommen. Bei Bedarf anpassen.', answers: ['Unter 2.000 €', '2.000 – 5.000 €', '5.000 – 10.000 €', '10.000 – 25.000 €', 'Über 25.000 €', 'Nicht sicher'], reject: {'Unter 2.000 €': 'stromkosten_unter_2000'}},
  {slot: 1, key: 'lever', multiple: true, q: 'Was treibt Ihre Stromkosten am stärksten?', hint: 'Mehrfachauswahl möglich.', answers: ['Hohe Lastspitzen / Leistungspreise', 'Hoher Stromverbrauch insgesamt', 'PV-Überschüsse bleiben ungenutzt', 'Neue Ladeinfrastruktur ist geplant', 'Schwankende Strompreise', 'Noch nicht eindeutig']},
  {slot: 2, key: 'timeline', q: 'Wann möchten Sie umsetzen?', answers: ['Innerhalb von 3 Monaten', 'In 3 bis 6 Monaten', 'In 6 bis 12 Monaten', 'Später als 12 Monate', 'Zunächst Potenzial verstehen']},
  {slot: 2, key: 'investment', q: 'Wie ist der Stand der Entscheidung?', answers: ['Budget / Business Case ist grundsätzlich freigegeben', 'Budget und Anforderungen werden aktuell definiert', 'Wir benötigen belastbare Zahlen für die Entscheidung']},
  {slot: 3, key: 'role', q: 'Welche Rolle haben Sie im Projekt?', answers: ['Geschäftsführung / Inhaber', 'Technische Leitung / Energiemanagement', 'Einkauf / Finanzen', 'Projektverantwortung', 'Beratung / Planung', 'Keine direkte Projektverantwortung']},
  {slot: 3, key: 'data', q: 'Welche Energiedaten liegen vor?', answers: ['Lastgangdaten und aktuelle Stromabrechnung liegen vor', 'Stromabrechnung liegt vor, Lastgang kann beschafft werden', 'Daten können kurzfristig zusammengestellt werden', 'Aktuell liegen noch keine Daten vor']},
  {form: true, q: 'Wohin dürfen wir Ihr Einsparpotenzial senden?'}
];

const quiz = $('#quiz');
const body = $('#quizBody');
const bar = $('#quizBar');
const backBtn = $('#quizBack');
let cur = 0;
const data = {};       // gleiche Struktur wie quiz.js: data[0] = 'Produktion / Industrie', data[1] = {cost, lever:[]}, ...
const contact = {};
let lastFocus = null;
let sending = false;

const getAnswer = s => s.key ? data[s.slot]?.[s.key] : data[s.slot];
function setAnswer(s, v) {
  if (s.key) data[s.slot] = {...(data[s.slot] || {}), [s.key]: v};
  else data[s.slot] = v;
}

function openQuiz() {
  lastFocus = document.activeElement;
  if (!data[1]?.cost) setAnswer(steps[1], costBucket(calc.cost));
  cur = 0;
  quiz.hidden = false;
  document.body.classList.add('noscroll');
  track('quiz_start', {calc_cost: calc.cost, calc_peaks: calc.peaks, calc_pv: calc.pv});
  renderStep();
}
function closeQuiz() {
  quiz.hidden = true;
  document.body.classList.remove('noscroll');
  lastFocus?.focus();
}
$$('[data-open-quiz]').forEach(b => b.addEventListener('click', openQuiz));
$('#quizClose').addEventListener('click', closeQuiz);
quiz.addEventListener('click', e => { if (e.target === quiz) closeQuiz(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !quiz.hidden) closeQuiz(); });
backBtn.addEventListener('click', () => { if (cur > 0) { cur--; renderStep(); } });

function next() { cur++; renderStep(); }

function renderStep() {
  const s = steps[cur];
  bar.style.width = ((cur + 1) / (steps.length + 1) * 100) + '%';
  backBtn.style.visibility = cur ? 'visible' : 'hidden';
  const head = `<p class="q-step">Frage ${cur + 1} von ${steps.length}</p><h2 id="qTitle">${s.q}</h2>${s.hint ? `<p class="q-hint">${s.hint}</p>` : ''}`;

  if (s.form) {
    body.innerHTML = `${head}<p class="q-hint">Ein Commeo-Experte ordnet Ihr Potenzial persönlich in Euro und Prozent ein.</p>
      <form class="q-form" id="qForm" novalidate>
        <div class="row"><label>Vorname<input name="first" autocomplete="given-name" required></label><label>Nachname<input name="last" autocomplete="family-name" required></label></div>
        <label>Unternehmen<input name="company" autocomplete="organization" required></label>
        <div class="row"><label>Geschäftliche E-Mail<input name="email" type="email" autocomplete="email" required></label><label>Telefon für Rückfragen<input name="phone" type="tel" autocomplete="tel" required></label></div>
        <div class="row"><label>PLZ des Standorts<input name="zip" inputmode="numeric" autocomplete="postal-code" maxlength="5" pattern="[0-9]{5}" required></label><label>Website <span class="opt">(optional)</span><input name="website" type="url" placeholder="https://"></label></div>
        <label class="consent"><input name="consent" type="checkbox" required><span>Ich stimme zu, dass Commeo meine Angaben zur Bearbeitung der Potenzialanalyse und zur persönlichen Kontaktaufnahme verwendet. Hinweise zum <a href="https://www.commeo.com/datenschutz/" target="_blank" rel="noopener">Datenschutz</a> habe ich zur Kenntnis genommen.</span></label>
        <button class="btn btn-block" id="qSubmit" disabled>Einsparpotenzial anfordern →</button>
      </form>`;
    const form = $('#qForm');
    const submit = $('#qSubmit');
    const validate = () => {
      $$('input', form).forEach(i => { contact[i.name] = i.type === 'checkbox' ? i.checked : i.value; });
      const ok = $$('input[required]', form).every(i => i.type === 'checkbox' ? i.checked : i.value.trim())
        && form.email.validity.valid && /^\d{5}$/.test(form.zip.value.trim());
      submit.disabled = !ok || sending;
    };
    $$('input', form).forEach(i => {
      if (i.type === 'checkbox') i.checked = Boolean(contact[i.name]); else i.value = contact[i.name] || '';
      i.addEventListener('input', validate);
      i.addEventListener('change', validate);
    });
    validate();
    form.addEventListener('submit', e => { e.preventDefault(); if (!submit.disabled) finish(submit); });
    form.first.focus();
    return;
  }

  const sel = getAnswer(s);
  const isOn = a => s.multiple ? (sel || []).includes(a) : sel === a;
  body.innerHTML = `${head}<div class="q-answers">${s.answers.map(a => `<button type="button" class="q-answer${isOn(a) ? ' on' : ''}" aria-pressed="${isOn(a)}">${a}</button>`).join('')}</div>${s.multiple ? `<button class="btn btn-block" id="qMulti" ${(sel || []).length ? '' : 'disabled'}>Weiter →</button>` : ''}`;
  $$('.q-answer', body).forEach(btn => btn.addEventListener('click', () => {
    const a = btn.textContent;
    if (s.multiple) {
      const cur = getAnswer(s) || [];
      const nextVals = cur.includes(a) ? cur.filter(x => x !== a)
        : a === 'Noch nicht eindeutig' ? [a] : [...cur.filter(x => x !== 'Noch nicht eindeutig'), a];
      setAnswer(s, nextVals);
      renderStep();
      return;
    }
    setAnswer(s, a);
    track('quiz_step', {step: cur + 1, question: s.key || 'betrieb', answer: a});
    if (s.reject?.[a]) return reject(s.reject[a]);
    btn.classList.add('on');
    setTimeout(next, 180); // Auto-Weiter: ein Klick pro Frage
  }));
  $('#qMulti')?.addEventListener('click', () => { track('quiz_step', {step: cur + 1, question: s.key, answer: getAnswer(s).join(' | ')}); next(); });
  $('.q-answer', body).focus();
}

function reject(reason) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({event: 'lead_disqualified', funnel: 'commeo_stromkosten', funnel_version: 'v2', reason, ...campaign});
  bar.style.width = '100%';
  backBtn.style.visibility = 'hidden';
  body.innerHTML = `<div class="q-done"><span class="q-icon q-icon-muted">i</span><p class="q-step">Aktuell keine passende Ausgangslage</p><h2 id="qTitle">Vielen Dank für Ihr Interesse.</h2><p>Commeo-Systeme richten sich an Gewerbe- und Industriestandorte mit mindestens etwa 2.000 € Stromkosten pro Monat.</p><button class="quiz-back" type="button" id="qFix">← Angabe korrigieren</button></div>`;
  $('#qFix').addEventListener('click', renderStep);
}

// identisch zu scoreLead() in /quiz.js
function scoreLead() {
  let score = 0;
  const points = {
    '2.000 – 5.000 €':8,'5.000 – 10.000 €':15,'10.000 – 25.000 €':20,'Über 25.000 €':25,
    'Hohe Lastspitzen / Leistungspreise':8,'PV-Überschüsse bleiben ungenutzt':7,'Neue Ladeinfrastruktur ist geplant':7,
    'Innerhalb von 3 Monaten':18,'In 3 bis 6 Monaten':15,'In 6 bis 12 Monaten':10,
    'Budget / Business Case ist grundsätzlich freigegeben':20,'Budget und Anforderungen werden aktuell definiert':15,'Wir benötigen belastbare Zahlen für die Entscheidung':8,
    'Lastgangdaten und aktuelle Stromabrechnung liegen vor':12,'Stromabrechnung liegt vor, Lastgang kann beschafft werden':9,'Daten können kurzfristig zusammengestellt werden':5,
    'Geschäftsführung / Inhaber':20,'Technische Leitung / Energiemanagement':18,'Einkauf / Finanzen':15,'Projektverantwortung':13,'Beratung / Planung':5
  };
  [0, 1, 2, 3].forEach(key => {
    const value = data[key];
    if (value && typeof value === 'object') Object.entries(value).forEach(([group, answer]) => {
      if (Array.isArray(answer)) score += Math.min(group === 'lever' ? 12 : Infinity, answer.reduce((sum, item) => sum + (points[item] || 0), 0));
      else score += points[answer] || 0;
    });
    else score += points[value] || 0;
  });
  return {score, tier: score >= 75 ? 'A' : score >= 45 ? 'B' : 'C'};
}

const shortNames = ['Betrieb', 'Energieprofil', 'Projekt', 'Passung'];

async function finish(submit) {
  sending = true;
  submit.disabled = true;
  submit.textContent = 'Wird gesendet …';
  const fit = scoreLead();
  const e = estimate();
  const leadCampaign = {...campaign, funnel_version: 'v2'};

  // Wie /quiz.js: Lead speichern, nicht blockierend. Der Server berechnet den Score selbst.
  try {
    const response = await fetch('/api/lead', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({contact, answers: {0: data[0], 1: data[1], 2: data[2], 3: data[3]}, campaign: leadCampaign})
    });
    if (!response.ok) console.error('lead endpoint returned', response.status);
  } catch (error) {
    console.error('lead persist failed', error);
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: `qualified_lead_${fit.tier.toLowerCase()}`,
    funnel: 'commeo_stromkosten',
    funnel_version: 'v2',
    lead_score: fit.score,
    lead_tier: fit.tier,
    answers: shortNames.map((question, i) => ({question, answer: data[i]})),
    calc: {cost: calc.cost, peaks: calc.peaks, pv: calc.pv, save_lo: e.loEur, save_hi: e.hiEur},
    ...campaign
  });

  const result = fit.tier === 'A'
    ? {label: 'Sehr hohe Projektpassung', title: 'Ihr Projekt passt sehr gut zu Commeo.', copy: 'Ihre Angaben zeigen ein konkretes und wirtschaftlich relevantes Projekt. Ein Commeo-Experte priorisiert Ihre Anfrage und meldet sich persönlich bei Ihnen.'}
    : fit.tier === 'B'
      ? {label: 'Gute Projektpassung', title: 'Ihre Ausgangslage ist vielversprechend.', copy: 'Ein Commeo-Experte prüft jetzt Ihre Angaben und die stärksten Einsparhebel. Sie erhalten anschließend eine persönliche Einschätzung.'}
      : {label: 'Individuelle Prüfung erforderlich', title: 'Wir prüfen Ihre Ausgangslage genauer.', copy: 'Einige Angaben benötigen eine fachliche Einordnung. Commeo prüft, ob und mit welchem Ansatz ein wirtschaftliches Einsparpotenzial besteht.'};
  // Übergabe an die bestehende Danke-Seite, die Google-Ads- und Meta-Conversion auslöst
  sessionStorage.setItem('commeo_lead_pending', JSON.stringify({...result, score: fit.score, tier: fit.tier, campaign: leadCampaign}));
  sessionStorage.removeItem('commeo_lead_fired');
  location.href = '/danke.html';
}

// Mobile-Nav-Schatten / Sticky-CTA ab Scroll
const sticky = $('.sticky-cta');
const calcBox = $('#rechner');
new IntersectionObserver(([en]) => sticky.classList.toggle('show', !en.isIntersecting), {threshold: 0}).observe(calcBox);
