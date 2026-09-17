// Mirror of scoreLead() in public/quiz.js. Kept server-side so the stored score
// cannot be forged by a crafted POST — the client value is never trusted.
const POINTS = {
  '2.000 – 5.000 €': 8, '5.000 – 10.000 €': 15, '10.000 – 25.000 €': 20, 'Über 25.000 €': 25,
  'Hohe Lastspitzen / Leistungspreise': 8, 'PV-Überschüsse bleiben ungenutzt': 7, 'Neue Ladeinfrastruktur ist geplant': 7,
  'Innerhalb von 3 Monaten': 18, 'In 3 bis 6 Monaten': 15, 'In 6 bis 12 Monaten': 10,
  'Budget / Business Case ist grundsätzlich freigegeben': 20, 'Budget und Anforderungen werden aktuell definiert': 15, 'Wir benötigen belastbare Zahlen für die Entscheidung': 8,
  'Lastgangdaten und aktuelle Stromabrechnung liegen vor': 12, 'Stromabrechnung liegt vor, Lastgang kann beschafft werden': 9, 'Daten können kurzfristig zusammengestellt werden': 5,
  'Geschäftsführung / Inhaber': 20, 'Technische Leitung / Energiemanagement': 18, 'Einkauf / Finanzen': 15, 'Projektverantwortung': 13, 'Beratung / Planung': 5
};

const LEVER_CAP = 12;

export function scoreAnswers(answers) {
  let score = 0;
  for (const value of Object.values(answers ?? {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [group, answer] of Object.entries(value)) {
        if (Array.isArray(answer)) {
          const sum = answer.reduce((total, item) => total + (POINTS[item] || 0), 0);
          score += group === 'lever' ? Math.min(LEVER_CAP, sum) : sum;
        } else {
          score += POINTS[answer] || 0;
        }
      }
    } else if (typeof value === 'string') {
      score += POINTS[value] || 0;
    }
  }
  return { score, tier: score >= 75 ? 'A' : score >= 45 ? 'B' : 'C' };
}
