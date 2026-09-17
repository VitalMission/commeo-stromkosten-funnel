import { sql, ensureSchema } from './_db.js';
import { scoreAnswers } from './_scoring.js';

const MAX_BODY_BYTES = 16 * 1024;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ZIP = /^\d{5}$/;

const FIELDS = {
  first:   { column: 'first_name', max: 80,  required: true },
  last:    { column: 'last_name',  max: 80,  required: true },
  company: { column: 'company',    max: 160, required: true },
  email:   { column: 'email',      max: 160, required: true, test: EMAIL },
  phone:   { column: 'phone',      max: 40,  required: true },
  zip:     { column: 'zip',        max: 5,   required: true, test: ZIP },
  website: { column: 'website',    max: 200, required: false }
};

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('payload too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return res.status(400).json({ error: 'invalid body' });
  }

  const contact = body.contact ?? {};
  const values = {};
  const errors = [];

  for (const [name, rule] of Object.entries(FIELDS)) {
    const raw = typeof contact[name] === 'string' ? contact[name].trim() : '';
    if (!raw) {
      if (rule.required) errors.push(name);
      values[rule.column] = null;
      continue;
    }
    if (raw.length > rule.max || (rule.test && !rule.test.test(raw))) {
      errors.push(name);
      continue;
    }
    values[rule.column] = raw;
  }

  if (contact.consent !== true) errors.push('consent');
  if (errors.length) return res.status(400).json({ error: 'validation failed', fields: errors });

  // Score is recomputed here; whatever the client claims is discarded.
  const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
  const { score, tier } = scoreAnswers(answers);
  const campaign = body.campaign && typeof body.campaign === 'object' ? body.campaign : {};

  try {
    await ensureSchema();
    const [row] = await sql`
      insert into leads (first_name, last_name, company, email, phone, zip, website, consent_at, lead_score, lead_tier, answers, campaign)
      values (${values.first_name}, ${values.last_name}, ${values.company}, ${values.email}, ${values.phone},
              ${values.zip}, ${values.website}, now(), ${score}, ${tier}, ${JSON.stringify(answers)}, ${JSON.stringify(campaign)})
      returning id
    `;
    return res.status(201).json({ id: row.id, tier, score });
  } catch (error) {
    console.error('lead insert failed', error);
    return res.status(500).json({ error: 'storage failed' });
  }
}
