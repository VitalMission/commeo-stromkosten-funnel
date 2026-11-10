# ALTCHA-Widget (selbst gehostet)

Menschen-Abfrage vor dem Absenden der Lead-Formulare in `/check.html` und `/v2`.

- `altcha.min.js`: `altcha@3.5.0`, Datei `dist/main/altcha.min.js` (MIT, siehe `LICENSE.txt`)
- `de.js`: `altcha@3.5.0`, Datei `dist/i18n/de.js` (deutsche Texte)

Beide Dateien werden als `type="module"` geladen und von hier ausgeliefert, nicht von einem CDN.
Die Gegenstelle auf dem Server ist `altcha-lib` in `api/_altcha.js` (Rätsel unter `/api/altcha`,
Prüfung in `/api/lead`).
