# Busplan (v1.0)

Bus-/Transportplanung für die Auswärtsspiele der Nachwuchsmannschaften des
1. SC 1911 Heiligenstadt — Teil der
[Tools-Übersicht](https://sc1911heiligenstadt.github.io/ToolsUebersicht/).

Löst die bisherige Excel „Busse Frühjahr/Herbst“ ab: je Mannschaft eine Liste der
Auswärtsspiele mit dem Status je Transport-Option (Stadtbus, Busunternehmen,
vereinseigene Busse, Eltern/Privatfahrer, Leihwagen).

Alle eingeloggten Nutzer können den Plan einsehen; **Bearbeiten dürfen
Administratoren und Mitglieder von Gruppen mit Bearbeiten-Recht für Busplan**
(vergeben in der Tools-Übersicht-Gruppenverwaltung).

## Bedienung

- **Übersicht** — Kennzahlen (Zusagen/Absagen/offene Punkte) und eine Tabelle je
  Mannschaft; Klick auf eine Zeile springt in den Busplan der Mannschaft. Button
  „🖨 Als PDF“ druckt eine Gesamtübersicht (Kennzahlen, Konflikte, je Mannschaft
  eine Tabelle mit Status je Bus-Option) — zum Ausdrucken oder als PDF speichern.
- **Busplan** — Mannschaft oben auswählen (die Reiter lassen sich per
  Drag-and-Drop neu anordnen, nur Bearbeiter/Admin — die Reihenfolge gilt danach
  auch in Übersicht, Liste und PDF-Export), darunter die Spiele als Tabelle mit
  einer Spalte je Bus-Option der Mannschaft. Klick auf einen Status-Chip setzt
  Zusage/Absage/offen/in Klärung/Unter Vorbereitung + optionale Notiz (z. B. für
  eine gemeinsame Fahrt mit einer anderen Mannschaft). Nutzen zwei Mannschaften
  dieselbe Bus-Option am selben Tag, wird das als Konflikt markiert (Warn-Symbol
  am Status, gesammelt in einer eigenen Übersichts-Karte) — beim Setzen eines
  Status auf einen bereits belegten Tag/Bus erscheint zusätzlich eine
  Sicherheitsabfrage.
- **Liste** — alle Spiele aller Mannschaften, filterbar nach Mannschaft und
  Textsuche (handyfreundlich).
- **Bus-Regeln** — zu jeder Bus-Option ein Freitext mit Regeln (z. B.
  Buchungsfrist, maximale Personenzahl, Abfahrtsort) hinterlegen; ist eine Regel
  gesetzt, erscheint ein ℹ️-Hinweis mit Tooltip an der jeweiligen Spalte im
  Busplan-Gitter. Für alle eingeloggten Nutzer einsehbar.
- **Einstellungen** — Saison anlegen/duplizieren/löschen, Bus-Optionen der
  aktuellen Saison pflegen, Mannschaften über „+ Mannschaft“ im Busplan-Tab.

Mannschaften und Bus-Optionen sind pro Saison frei konfigurierbar, da sich das
Angebot (Busunternehmen, Jugendmannschaften) von Halbjahr zu Halbjahr ändert.

## Technik

Vanilla-JS-App (kein Build-Step), Anmeldung & Speicherung laufen über das zentrale
ToolsUebersicht-Login-Gateway (`admin-worker.js`), das die Daten serverseitig in der
Vereins-Nextcloud ablegt (`busplan.json`). Kein separates Passwort im Client;
gleichzeitige Änderungen von zwei Geräten werden erkannt und gemeldet.

- `index.html`, `app.js`, `db.js`, `config.js`, `style.css` — die App

## Erstbefüllung

Die reale Frühjahr-2026-Datenlage (Trainer, echte Spieltermine) enthält
Personendaten und liegt daher **nicht** im Repository. Als berechtigter Nutzer
anmelden, Tab **Busplan** → „Datendatei auswählen…“ (erscheint, solange die
Saison noch keine Mannschaft hat) → die separat bereitgestellte Seed-JSON wählen.
Danach wird der Plan ausschließlich in der App gepflegt.
