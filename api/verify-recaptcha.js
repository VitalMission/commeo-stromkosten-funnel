const THRESHOLD = 0.5; // Google's recommended default for reCAPTCHA v3
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'method_not_allowed' });
    return;
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  const { token } = req.body || {};

  if (!secret) {
    res.status(500).json({ success: false, error: 'missing_secret' });
    return;
  }
  if (!token) {
    res.status(400).json({ success: false, error: 'missing_token' });
    return;
  }

  try {
    const params = new URLSearchParams({ secret, response: token });
    const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    const result = await verifyRes.json();
    const pass = Boolean(result.success) && (typeof result.score !== 'number' || result.score >= THRESHOLD);
    res.status(200).json({ success: pass, score: result.score ?? null, action: result.action ?? null });
  } catch (err) {
    res.status(502).json({ success: false, error: 'verify_request_failed' });
  }
}
