import { createHmac, timingSafeEqual } from 'node:crypto';
import { sql, ensureSchema } from './_db.js';

const COOKIE = 'commeo_admin';
const SESSION_S = 12 * 60 * 60; // a login lasts one working day
const PAGE_SIZE = 500;

const MAX_ATTEMPTS = 5;        // wrong passwords before a client is locked out
const WINDOW_MS = 15 * 60_000; // attempts older than this stop counting
const LOCKOUT_MS = 15 * 60_000;

/**
 * Failed attempts per client, so a password cannot simply be enumerated. The
 * repository is public: the endpoint and its login form are both readable,
 * which leaves the password as the only obstacle.
 *
 * Held in memory on purpose. This app runs as a single Node server (see
 * server.mjs), so one map covers it. If it is ever split across instances the
 * counter becomes per-instance and the effective limit multiplies -- still far
 * better than none, but that is the moment to move this into Postgres.
 */
const attempts = new Map();

function clientKey(req) {
  const forwarded = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket?.remoteAddress || 'unknown';
}

function lockoutRemaining(key) {
  const entry = attempts.get(key);
  if (!entry?.blockedUntil) return 0;
  const left = entry.blockedUntil - Date.now();
  if (left <= 0) {
    attempts.delete(key);
    return 0;
  }
  return left;
}

function noteFailure(key) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now, blockedUntil: 0 });
    return;
  }
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) entry.blockedUntil = now + LOCKOUT_MS;
  // Keep the map from growing without bound on a long-lived instance.
  if (attempts.size > 5000) {
    for (const [k, v] of attempts) {
      if (now - v.firstAt > WINDOW_MS && !v.blockedUntil) attempts.delete(k);
    }
  }
}

function safeEqual(a, b) {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  // timingSafeEqual throws on length mismatch, so compare lengths separately.
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * The session is "<expiry>.<hmac>", signed with the admin password itself: no second secret to manage,
 * and changing ADMIN_PASSWORD signs everybody out.
 */
function sign(expiry) {
  return createHmac('sha256', process.env.ADMIN_PASSWORD)
    .update(`${process.env.ADMIN_USERNAME}|${expiry}`)
    .digest('hex');
}

function sessionCookie(req) {
  const match = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function authorized(req) {
  const [expiry, mac] = sessionCookie(req).split('.');
  if (!expiry || !mac || Number(expiry) * 1000 < Date.now()) return false;
  return safeEqual(mac, sign(expiry));
}

function startSession(res) {
  const expiry = Math.floor(Date.now() / 1000) + SESSION_S;
  res.setHeader('Set-Cookie',
    `${COOKIE}=${expiry}.${sign(expiry)}; Path=/; Max-Age=${SESSION_S}; HttpOnly; Secure; SameSite=Strict`);
}

function endSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`);
}

async function readForm(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 4096) break; // a login form is two short fields
  }
  return new URLSearchParams(raw);
}

function credentialsMatch(form) {
  const user = String(form.get('username') || '').trim().toLowerCase();
  const expectedUser = String(process.env.ADMIN_USERNAME).trim().toLowerCase();
  // Both compared every time, so a wrong username takes as long as a wrong password.
  const userOk = safeEqual(user, expectedUser);
  const passOk = safeEqual(String(form.get('password') || ''), process.env.ADMIN_PASSWORD);
  return userOk && passOk;
}

function loginPage(message = '') {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Anmelden · Commeo Leads</title><style>
:root{--bg:#0f1115;--card:#171a21;--line:#272b34;--text:#e7e9ee;--muted:#8b93a5;--accent:#4ade80;--err:#f87171}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:var(--bg);color:var(--text);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
form{width:100%;max-width:360px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:32px 28px}
h1{margin:0 0 4px;font-size:20px;letter-spacing:-.01em}p.sub{margin:0 0 24px;color:var(--muted);font-size:13px}
label{display:block;margin:0 0 6px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
input{width:100%;margin:0 0 18px;padding:11px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--text);font:inherit}
input:focus{outline:none;border-color:var(--accent)}
button{width:100%;padding:12px;border:0;border-radius:8px;background:var(--accent);color:#052e16;font:inherit;font-weight:600;cursor:pointer}
button:hover{filter:brightness(1.08)}.err{margin:0 0 18px;padding:10px 12px;border-radius:8px;background:rgba(248,113,113,.12);color:var(--err);font-size:13px}
</style></head><body>
<form method="post" action="/admin" autocomplete="on">
  <h1>Commeo Leads</h1><p class="sub">Stromkosten-Funnel · Anmeldung</p>
  ${message ? `<p class="err">${escapeHtml(message)}</p>` : ''}
  <label for="username">Benutzername</label>
  <input id="username" name="username" autocomplete="username" required autofocus>
  <label for="password">Passwort</label>
  <input id="password" name="password" type="password" autocomplete="current-password" required>
  <button type="submit">Anmelden</button>
</form></body></html>`;
}

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

/**
 * The funnel stores the website exactly as typed, which is usually "www.firma.de" or "firma.de" with no
 * scheme -- as an href that is a relative path, so the link opened stromkosten.commeo.com/www.firma.de.
 * Add https:// when there is no scheme, and refuse any scheme other than http(s): the value comes from a
 * public form, and a "javascript:" link here would run in the admin's session.
 */
function websiteHref(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return null;
  return `https://${raw.replace(/^\/+/, '')}`;
}

const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;

function flatten(answers) {
  const parts = [];
  for (const value of Object.values(answers ?? {})) {
    if (Array.isArray(value)) parts.push(value.join(', '));
    else if (value && typeof value === 'object') parts.push(...Object.values(value).map(v => Array.isArray(v) ? v.join(', ') : v));
    else if (typeof value === 'string') parts.push(value);
  }
  return parts.filter(Boolean);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_USERNAME) {
    return res.status(503).send('ADMIN_USERNAME / ADMIN_PASSWORD are not configured.');
  }
  const html = (code, body) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(code).send(body);
  };
  const redirect = to => {
    res.setHeader('Location', to);
    return res.status(303).send('');
  };

  if (new URL(req.url, 'http://x').searchParams.has('logout')) {
    endSession(res);
    return redirect('/admin');
  }

  if (req.method === 'POST') {
    const key = clientKey(req);
    const locked = lockoutRemaining(key);
    if (locked) {
      res.setHeader('Retry-After', String(Math.ceil(locked / 1000)));
      return html(429, loginPage('Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.'));
    }
    if (!credentialsMatch(await readForm(req))) {
      noteFailure(key);
      return html(401, loginPage('Benutzername oder Passwort ist falsch.'));
    }
    attempts.delete(key);
    startSession(res);
    return redirect('/admin');
  }

  if (!authorized(req)) return html(200, loginPage());

  await ensureSchema();
  const rows = await sql`
    select id, created_at, first_name, last_name, company, email, phone, zip, website,
           consent_at, lead_score, lead_tier, answers, campaign
    from leads order by created_at desc limit ${PAGE_SIZE}
  `;

  const url = new URL(req.url, `https://${req.headers.host}`);
  if (url.searchParams.get('format') === 'csv') {
    const header = ['id', 'created_at', 'first', 'last', 'company', 'email', 'phone', 'zip', 'website', 'consent_at', 'score', 'tier', 'answers', 'campaign'];
    const body = rows.map(row => [
      row.id, row.created_at.toISOString(), row.first_name, row.last_name, row.company, row.email,
      row.phone, row.zip, row.website, row.consent_at.toISOString(), row.lead_score, row.lead_tier,
      flatten(row.answers).join(' | '), JSON.stringify(row.campaign)
    ].map(csvCell).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="commeo-leads-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.status(200).send('﻿' + [header.join(','), ...body].join('\n'));
  }

  const tally = tier => rows.filter(row => row.lead_tier === tier).length;
  const format = date => new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Berlin'
  }).format(date);

  const table = rows.map(row => `<tr>
      <td class="num">${row.id}</td>
      <td class="nowrap">${escapeHtml(format(row.created_at))}</td>
      <td><span class="tier tier-${escapeHtml(row.lead_tier.toLowerCase())}">${escapeHtml(row.lead_tier)}</span> <span class="score">${row.lead_score}</span></td>
      <td><strong>${escapeHtml(row.company)}</strong><br><span class="muted">${escapeHtml(row.first_name)} ${escapeHtml(row.last_name)}</span></td>
      <td><a href="mailto:${escapeHtml(row.email)}">${escapeHtml(row.email)}</a><br><a href="tel:${escapeHtml(row.phone)}">${escapeHtml(row.phone)}</a></td>
      <td class="nowrap">${escapeHtml(row.zip)}</td>
      <td>${websiteHref(row.website) ? `<a href="${escapeHtml(websiteHref(row.website))}" rel="noreferrer noopener" target="_blank">Website</a>` : '<span class="muted">–</span>'}</td>
      <td class="answers">${flatten(row.answers).map(item => `<span>${escapeHtml(item)}</span>`).join('')}</td>
      <td class="answers">${Object.entries(row.campaign).map(([key, value]) => `<span>${escapeHtml(key)}: ${escapeHtml(value)}</span>`).join('') || '<span class="muted">direkt</span>'}</td>
    </tr>`).join('');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Leads · Commeo Stromkosten-Funnel</title><style>
:root{color-scheme:light dark;--bg:#0f1115;--card:#171a21;--line:#272b34;--text:#e7e9ee;--muted:#8b93a5;--accent:#4ade80}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
header{display:flex;flex-wrap:wrap;gap:16px;align-items:baseline;justify-content:space-between;padding:24px 28px;border-bottom:1px solid var(--line)}
h1{margin:0;font-size:18px;letter-spacing:-.01em}
.stats{display:flex;gap:18px;color:var(--muted);font-size:13px}.stats b{color:var(--text)}
a{color:#7dd3fc}a.btn{display:inline-block;padding:7px 14px;border:1px solid var(--line);border-radius:7px;text-decoration:none;color:var(--text);background:var(--card)}
.wrap{overflow-x:auto;padding:20px 28px 60px}
table{border-collapse:collapse;width:100%;min-width:1100px}
th{position:sticky;top:0;background:var(--bg);text-align:left;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:10px;border-bottom:1px solid var(--line)}
td{padding:12px 10px;border-bottom:1px solid var(--line);vertical-align:top}
tr:hover td{background:var(--card)}
.num,.score{font-variant-numeric:tabular-nums;color:var(--muted)}.nowrap{white-space:nowrap}.muted{color:var(--muted)}
.tier{display:inline-block;min-width:20px;text-align:center;padding:1px 7px;border-radius:5px;font-weight:600;font-size:12px}
.tier-a{background:#14532d;color:#86efac}.tier-b{background:#1e3a5f;color:#93c5fd}.tier-c{background:#3f3f46;color:#d4d4d8}
.answers{max-width:320px}.answers span{display:block;font-size:12px;color:var(--muted)}
.empty{padding:60px 28px;color:var(--muted)}
</style></head><body>
<header>
  <div><h1>Leads · Stromkosten-Funnel</h1>
  <div class="stats"><span><b>${rows.length}</b> gesamt</span><span>A: <b>${tally('A')}</b></span><span>B: <b>${tally('B')}</b></span><span>C: <b>${tally('C')}</b></span></div></div>
  <div><a class="btn" href="?format=csv">CSV exportieren</a> <a class="btn" href="/admin?logout">Abmelden</a></div>
</header>
${rows.length ? `<div class="wrap"><table><thead><tr>
<th>#</th><th>Eingang</th><th>Score</th><th>Firma / Person</th><th>Kontakt</th><th>PLZ</th><th>Web</th><th>Antworten</th><th>Kampagne</th>
</tr></thead><tbody>${table}</tbody></table></div>`
: '<p class="empty">Noch keine Leads eingegangen.</p>'}
</body></html>`);
}
