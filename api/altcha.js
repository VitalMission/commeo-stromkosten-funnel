import { newChallenge } from './_altcha.js';

/** Hands the lead forms a fresh human-check puzzle (see _altcha.js). */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(await newChallenge());
}
