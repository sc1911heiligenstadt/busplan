# 🚌 Busplan

Wer fährt wann mit welchem Bus zum Auswärtsspiel. Der Busplan sammelt für jede
Saison alle Auswärtsfahrten der Nachwuchsmannschaften, hält je Fahrt fest,
welches Fahrzeug vorgesehen ist und wie weit die Zusage gediehen ist, und zeigt
sofort, wo zwei Mannschaften am selben Tag denselben Bus wollen.

**➡️ [Busplan öffnen](https://sc1911heiligenstadt.github.io/busplan/)**

## Was drin ist

| Reiter | Wofür |
|---|---|
| **Übersicht** | Der Saisonstand auf einen Blick: offene Bus-Anfragen, der Stand der Erinnerungen und die Konflikte, bei denen ein Fahrzeug doppelt verplant ist. Von hier geht auch der PDF-Ausdruck |
| **Busplan** | Die Planung nach Mannschaft — je Spiel das vorgesehene Fahrzeug und der Status |
| **Liste** | Dieselben Fahrten quer über alle Mannschaften als flache Liste, mit Suche und Mannschafts-Filter |
| **Bus frei?** | Die schnelle Frage vor dem Zusagen: ist an einem bestimmten Tag noch ein Fahrzeug frei — und wenn ja, direkt anfragen. Darunter stehen alle Anfragen zum Entscheiden |
| **Bus-Regeln** | Was bei welchem Fahrzeug zu beachten ist, einmal hinterlegt statt jedes Mal nachgefragt |
| **Einstellungen** | Saison anlegen, duplizieren oder löschen; einmaliger Import des alten Excel-Plans |
| **Info** | Was das Werkzeug tut, die Änderungsliste und der Datenschutz-Hinweis |

## Die Fahrzeuge und der Status

Als Fahrzeuge sind Stadtbus, Villa Lampe, Lärz & Weiß, die beiden SCH-Busse
(HIG und EIC), der Leihwagen des VW-Autohauses sowie „Eltern / Privatfahrer“
hinterlegt. Nur echte einzelne Fahrzeuge sind **abfragbar** — sie können an
einem Tag belegt sein und lassen sich anfragen. Eltern-Fahrten sind das
naturgemäß nicht und stehen deshalb außerhalb der Belegungsprüfung.

Jede Fahrt trägt einen Status: **Zusage**, **Absage**, **offen**, **in Klärung**
oder **Unter Vorbereitung**. Aus den Zusagen ergibt sich die Belegung, aus
doppelten Zusagen der Konflikt-Hinweis auf der Übersicht.

## Erinnerungen

Drei Tage vor einer zugesagten Fahrt bekommen die Trainer der Mannschaft
automatisch eine Nachricht aufs Handy und eine E-Mail — mit Tag, Ort, dem
zugesagten Bus und dessen Regeln. Nur eine **Zusage** löst das aus; doppelt
kommt die Erinnerung nie. Die Karte *Bus-Erinnerungen* in der Übersicht zeigt,
wann der Versand zuletzt lief und für welche Mannschaft niemand erreichbar war.

## Zugang

Die Anmeldung läuft über die [Tools-Übersicht](https://sc1911heiligenstadt.github.io/ToolsUebersicht/) — dort einmal anmelden, danach ist dieses Werkzeug offen.

Die Rechte gelten in drei Stufen:

- **Sehen** — Plan, Liste, Belegung und Bus-Regeln ansehen. Einen Bus
  **anfragen** darf diese Stufe ausdrücklich auch; dafür braucht es kein
  Bearbeiten-Recht.
- **Bearbeiten** — Mannschaften, Fahrten und Bus-Optionen pflegen, Status
  setzen, Regeln ändern, über Anfragen entscheiden, PDF-Ausdruck.
- **Administrieren** — zusätzlich der Reiter *Einstellungen*: Saisons und der
  einmalige Import.

Wer welche Stufe hat, legt die Tools-Übersicht fest.

## Lokal starten

Über den Eintrag `busplan` in `E:\.claude\launch.json` — der Server läuft dann auf `http://localhost:8792/`.

## Technik

Vanilla JavaScript ohne Build-Schritt — die Dateien werden so ausgeliefert, wie sie im Repo liegen. Veröffentlicht über GitHub Pages. Die Daten liegen in der Vereins-Nextcloud; der Zugriff läuft ausschließlich über den Login-Worker der Tools-Übersicht, nie mit Zugangsdaten im Browser.

| Datei | Inhalt |
|---|---|
| `index.html` | die einzige Seite der App, alle Reiter |
| `app.js` | Planung, Konfliktprüfung, Busabfrage, Anfragen, PDF |
| `config.js` | Bus-Optionen, Mannschafts-Vorlage, Änderungsliste |
| `db.js` | Anbindung an den Gateway-Worker |
| `style.css` | Gestaltung, einschließlich Druckansicht |

Im Repo stehen nur Fahrzeugnamen, Mannschaftsnamen und Ligen — keine Personendaten. Trainer und echte Spieltermine kommen ausschließlich über den einmaligen Import in die Nextcloud.

---

Ein Werkzeug des 1. SC 1911 Heiligenstadt. Alle Werkzeuge auf einen Blick: [Tools-Übersicht](https://sc1911heiligenstadt.github.io/ToolsUebersicht/) · Erklärungen im [Toolbox Wiki](https://sc1911heiligenstadt.github.io/Vereinswiki/).
