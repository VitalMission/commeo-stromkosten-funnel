// Salesforce Web-to-Lead, shared by the funnel (/check.html + quiz.js) and v2 (/v2 + funnel.js).
// PRODUCTION org values (snippet "Commeo Web To Lead Prod Snippet"). All Salesforce IDs live in the SF block below.
// Open points to confirm with Commeo (values below are provisional):
//  - Campaign 701Sc00001OB5Kb is named "Squarevest LeadGen Campaign" in the snippet: is it the right one for this landing page?
//  - Automation Id / Automation: sent empty on purpose (no value known; they may trigger Salesforce flows).
//  - Form / Funnel: provisional values, see SF.form and the `funnel` argument of send().
//  - gclid, fbclid, utm_medium/content/term have no Salesforce field: appended to Form Content (see tracking()).
window.CommeoSalesforce = (() => {
  const SF = {
    DEBUG: false,
    endpoint: 'https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8&orgId=00DWz000004u7Az',
    oid: '00DWz000004u7Az',
    campaignId: '701Sc00001OB5Kb',
    form: 'Stromkosten Potenzialanalyse',
    formContentMax: 131000,
    timeoutMs: 10000,
    fieldIds: {
      automationId: '00NSc00000CQTUD', automation: '00NSc00000CQTUE', formContent: '00NSc00000CQTUF', form: '00NSc00000CQTUG',
      funnel: '00NSc00000CQTUH', utmCampaignId: '00NSc00000CQTUI', utmCampaign: '00NSc00000CQTUJ', utmSource: '00NSc00000CQTUK'
    },
    // Character limits per Salesforce field. Longer values can make the lead creation fail.
    limits: {first_name: 40, last_name: 80, company: 40, email: 80, phone: 40, zip: 20, url: 80, utm: 255}
  };
  // Same limits for the funnel's <input name="..."> fields
  const inputLimits = {first: SF.limits.first_name, last: SF.limits.last_name, company: SF.limits.company, email: SF.limits.email, phone: SF.limits.phone, website: SF.limits.url};

  const clip = (value, max) => String(value ?? '').trim().slice(0, max);

  // Attribution without a Salesforce field of its own, appended to Form Content
  const trackingKeys = ['utm_medium', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
  const tracking = campaign => trackingKeys.filter(key => campaign[key]).map(key => `${key}: ${campaign[key]}`);

  // pairs: [[question, answer], ...] -> "Question A: Answer A" per line
  function formContent(pairs, campaign) {
    const lines = pairs.map(([question, answer]) => `${question}: ${Array.isArray(answer) ? answer.join(', ') : answer ?? ''}`);
    const extra = tracking(campaign);
    return clip((extra.length ? [...lines, '', ...extra] : lines).join('\n'), SF.formContentMax);
  }

  // Applies the field limits to a form's inputs (maxlength)
  function limitInputs(root) {
    root.querySelectorAll('input[name]').forEach(input => {
      if (inputLimits[input.name]) input.maxLength = inputLimits[input.name];
    });
  }

  // Resolves when Salesforce answered (iframe load) or after the timeout. Never rejects:
  // the response is cross-origin and unreadable, and a Salesforce problem must not block the visitor.
  // funnel: 'commeo_stromkosten' (v1) or 'commeo_stromkosten_v2' (v2)
  function send({contact, campaign = {}, pairs, funnel}) {
    return new Promise(resolve => {
      const payload = {
        oid: SF.oid,
        retURL: location.href.split('#')[0],
        lead_source: 'Web',
        Campaign_ID: SF.campaignId,
        first_name: clip(contact.first, SF.limits.first_name),
        last_name: clip(contact.last, SF.limits.last_name),
        company: clip(contact.company, SF.limits.company),
        email: clip(contact.email, SF.limits.email),
        phone: clip(contact.phone, SF.limits.phone),
        zip: clip(contact.zip, SF.limits.zip),
        url: clip(contact.website, SF.limits.url),
        [SF.fieldIds.automationId]: '',
        [SF.fieldIds.automation]: '',
        [SF.fieldIds.formContent]: formContent(pairs, campaign),
        [SF.fieldIds.form]: SF.form,
        [SF.fieldIds.funnel]: funnel,
        [SF.fieldIds.utmCampaignId]: clip(campaign.utm_id || campaign.utm_campaign_id, SF.limits.utm),
        [SF.fieldIds.utmCampaign]: clip(campaign.utm_campaign, SF.limits.utm),
        [SF.fieldIds.utmSource]: clip(campaign.utm_source, SF.limits.utm)
      };
      if (SF.DEBUG) {
        console.groupCollapsed('[Commeo WTL] Submit → ' + SF.endpoint);
        console.table(payload);
        console.log(`Form Content (${payload[SF.fieldIds.formContent].length}/${SF.formContentMax}):\n${payload[SF.fieldIds.formContent]}`);
        console.groupEnd();
      }
      const frame = document.createElement('iframe');
      frame.name = 'sf_frame';
      frame.hidden = true;
      frame.setAttribute('aria-hidden', 'true');
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = SF.endpoint;
      form.target = 'sf_frame';
      form.acceptCharset = 'UTF-8';
      form.hidden = true;
      Object.entries(payload).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });
      let done = false;
      const t0 = performance.now();
      const finish = reason => {
        if (done) return;
        done = true;
        if (SF.DEBUG) console.log(`[Commeo WTL] ${reason === 'load' ? 'Salesforce hat geantwortet (iframe load)' : `Timeout nach ${SF.timeoutMs / 1000}s – keine Antwort`} · ${Math.round(performance.now() - t0)}ms`);
        resolve();
      };
      frame.addEventListener('load', () => finish('load'));
      setTimeout(() => finish('timeout'), SF.timeoutMs);
      document.body.append(frame, form);
      form.submit();
    });
  }

  return {send, limitInputs};
})();
