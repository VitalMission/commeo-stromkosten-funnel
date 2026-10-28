import { createHash } from 'node:crypto';
import { createChallenge, randomInt } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import { CappedMap, deriveHmacKeySecret } from 'altcha-lib/frameworks/express';
import { verify } from 'altcha-lib/frameworks/shared';

/**
 * Human check for the lead forms (ALTCHA, self-hosted proof of work: no third party, no cookies).
 * The browser solves a small PBKDF2 puzzle; /api/lead only stores a lead with a valid, unused solution.
 *
 * The signing secret is ALTCHA_HMAC_SECRET when set. Otherwise it is derived from DATABASE_URL, a secret
 * every deployment of this app already has, so the check works without a new environment variable.
 */
const CHALLENGE_TTL_S = 20 * 60;

const hmacSignatureSecret = process.env.ALTCHA_HMAC_SECRET
  || createHash('sha256').update(`commeo-altcha|${process.env.DATABASE_URL ?? ''}`).digest('hex');
const hmacKeySignatureSecret = deriveHmacKeySecret(hmacSignatureSecret);

/**
 * Solutions already used, so one solved puzzle cannot submit many leads. In memory on purpose, like the
 * admin rate limit: one server instance, and a challenge expires after 20 minutes anyway.
 */
const used = new CappedMap({ maxSize: 10_000 });

export async function newChallenge() {
  return createChallenge({
    algorithm: 'PBKDF2/SHA-256',
    // Tuned to about one second on a mid-range phone: enough to make mass submissions expensive, not to annoy.
    cost: 2_000,
    counter: randomInt(1_500, 4_500),
    deriveKey,
    expiresAt: Math.floor(Date.now() / 1000) + CHALLENGE_TTL_S,
    hmacSignatureSecret,
    hmacKeySignatureSecret: await hmacKeySignatureSecret
  });
}

/** Returns null when the payload is a valid, unused solution, otherwise the reason it was rejected. */
export async function humanCheckError(payload) {
  if (typeof payload !== 'string' || !payload || payload.length > 4096) return 'missing';
  const { error } = await verify(payload, deriveKey, hmacSignatureSecret, await hmacKeySignatureSecret, used);
  return error;
}
