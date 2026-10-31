const NETWORKS = { ig: 'Instagram', fb: 'Facebook', an: 'Audience Network', msg: 'Messenger' };
const TEST_DOMAINS = ['wearevitalmission.com', 'squarevest.ag', 'example.com', 'mailinator.com'];
const TIMEOUT_MS = 5000;

// Slack mrkdwn only needs these three escaped; everything here comes from a public form.
const escapeMrkdwn = value => String(value ?? '').replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]));

function isTestLead({ first, last, email }) {
  const address = email.toLowerCase();
  return /\btest/i.test(`${first} ${last}`)
    || address.includes('test')
    || TEST_DOMAINS.some(domain => address.endsWith(`@${domain}`));
}

function origin(campaign) {
  const source = campaign.utm_source ? String(campaign.utm_source) : '';
  const network = NETWORKS[source.toLowerCase()] || source;
  const adName = String(campaign.utm_content || '').replace(/\s+[–-]\s+Kopie$/i, '').trim().slice(0, 45);
  return [network, adName].filter(Boolean).join(' · ') || 'direkt/organisch';
}

// v2/funnel.js tags its leads with funnel_version 'v2'; quiz.js (the original funnel at / → /check.html) sends none.
const funnelOf = campaign => campaign.funnel_version === 'v2' ? 'v2' : 'v1';

// Host and path of the page the form was sent from, without query or hash (those carry the UTMs and click ids).
function pageOf(url) {
  const match = String(url ?? '').match(/^https?:\/\/([^/?#]+)([^?#]*)/i);
  return match ? `${match[1]}${match[2]}`.replace(/\/$/, '') : '';
}

/**
 * Posts a short lead notice to the Slack channel behind the Incoming Webhook. Deliberately leaves the
 * phone number out: the channel is a heads-up, the full record stays in /admin.
 * Returns true only when Slack accepted the message; never throws.
 */
export async function sendSlackLead(url, { id, contact, answers, campaign, page }) {
  if (isTestLead(contact)) return false;

  const shortName = `${contact.first} ${[...contact.last][0]}.`;
  const now = new Date().toLocaleString('de-DE', {
    timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const title = 'Neuer Lead (Commeo)';
  const fields = [
    ['Name', shortName],
    ['Firma', contact.company],
    ['E-Mail', contact.email],
    ['Quelle', origin(campaign)],
    ['Seite', [funnelOf(campaign), pageOf(page)].filter(Boolean).join(' · ')],
    ['Branche', typeof answers[0] === 'string' ? answers[0] : '-'],
    ['Stromkosten/Jahr', answers[1]?.cost || '-'],
    ['Eingang', `${now} (Berlin)`],
    ['Lead-ID', id ? `#${id} (siehe /admin)` : '-']
  ];
  const body = {
    text: escapeMrkdwn(`${title} - ${shortName}, ${contact.company}`),
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: title } },
      { type: 'section', fields: fields.map(([key, value]) => ({ type: 'mrkdwn', text: `*${key}*\n${escapeMrkdwn(String(value).slice(0, 300))}` })) }
    ]
  };

  try {
    const result = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!result.ok) console.error(`[slack] status=${result.status}`);
    return result.ok;
  } catch (error) {
    console.error(`[slack] network error: ${error.cause?.code || error.message}`);
    return false;
  }
}
