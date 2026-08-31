# 🚌 Busplan

Wer fährt wann mit welchem Bus zum Auswärtsspiel. Der Busplan sammelt für jede
Saison alle Auswärtsfahrten der Nachwuchsmannschaften, hält je Fahrt fest,
welches Fahrzeug vorgesehen ist und wie weit die Zusage gediehen ist, und zeigt
sofort, wo zwei Mannschaften am selben Tag denselben Bus wollen.

**➡️ [Busplan öffnen](https://sc1911heiligenstadt.github.io/busplan/)**

## Was drin ist

| Reiter | Wofür |
|---|---|
| **Übersicht** | Der Saisonstand auf einen Blick: offene Bus-Anfragen, anstehende Erinnerungen und die Konflikte, bei denen ein Fahrzeug doppelt verplant ist |
| **Busplan** | Die Planung nach Mannschaft — je Spiel das vorgesehene Fahrzeug und der Status |
| **Liste** | Dieselben Fahrten als flache, durchsuchbare Liste; von hier geht auch der Export |
| **Bus frei?** | Die schnelle Frage vor dem Zusagen: ist an einem bestimmten Tag noch ein Fahrzeug frei — und wenn ja, direkt anfragen |
| **Bus-Regeln** | Was bei welchem Fahrzeug zu beachten ist, einmal hinterlegt statt jedes Mal nachgefragt |
| **Einstellungen** | Saison anlegen, duplizieren oder löschen; einmaliger Import des alten Excel-Plans |

## Die Fahrzeuge und der Status

Als Fahrzeuge sind Stadtbus, Villa Lampe, Lärz & Weiß, die beiden SCH-Busse
(HIG und EIC), der Leihwagen des VW-Autohauses sowie „Eltern / Privatfahrer"
hinterlegt. Nur echte einzelne Fahrzeuge sind **abfragbar** — sie können an
einem Tag belegt sein und lassen sich anfragen. Eltern-Fahrten sind das
naturgemäß nicht und stehen deshalb außerhalb der Belegungsprüfung.

Jede Fahrt trägt einen Status: **Zusage**, **Absage**, **offen**, **in Klärung**
oder **Unter Vorbereitung**. Aus den Zusagen ergibt sich die Belegung, aus
doppelten Zusagen der Konflikt-Hinweis auf der Übersicht.

## Zugang

Die Anmeldung läuft über die [Tools-Übersicht](https://sc1911heiligenstadt.github.io/ToolsUebersicht/) — dort einmal anmelden, danach ist dieses Werkzeug offen.

Die Rechte gelten in drei Stufen: **Sehen** (Plan, Liste und Belegung ansehen),
**Bearbeiten** (Fahrten pflegen, Busse anfragen, Status setzen) und
**Administrieren** (Reiter *Einstellungen*: Saisons und der einmalige Import).
Wer welche Stufe hat, legt die Tools-Übersicht fest.

## Lokal starten

Über den Eintrag `busplan` in `E:\.claude\launch.json` — der Server läuft dann auf `http://localhost:8792/`.

## Technik

Vanilla JavaScript ohne Build-Schritt — die Dateien werden so ausgeliefert, wie sie im Repo liegen. Veröffentlicht über GitHub Pages. Die Daten liegen in der Vereins-Nextcloud; der Zugriff läuft ausschließlich über den Login-Worker der Tools-Übersicht, nie mit Zugangsdaten im Browser.

Im Repo stehen nur Fahrzeugnamen, Mannschaftsnamen und Ligen — keine Personendaten. Trainer und echte Spieltermine kommen ausschließlich über den einmaligen Import in die Nextcloud.

---

Ein Werkzeug des 1. SC 1911 Heiligenstadt. Alle Werkzeuge auf einen Blick: [Tools-Übersicht](https://sc1911heiligenstadt.github.io/ToolsUebersicht/) · Erklärungen im [Toolbox Wiki](https://sc1911heiligenstadt.github.io/Vereinswiki/).
