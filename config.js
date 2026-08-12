const APP_VERSION = "1.0";

// Startsaison, falls im Gateway noch nichts liegt.
const DEFAULT_SEASON = "Fruehjahr-2026";

// Status-Werte je Spiel/Bus-Option — Reihenfolge bestimmt die Dropdown-Reihenfolge.
const STATUS_WERTE = [
  { id: "", label: "—", farbe: "#c7ccd6" },
  { id: "zusage", label: "Zusage", farbe: "#2d8c4e" },
  { id: "absage", label: "Absage", farbe: "#c0392b" },
  { id: "offen", label: "offen", farbe: "#c9941f" },
  { id: "klaerung", label: "in Klärung", farbe: "#d2691e" },
  { id: "vorbereitung", label: "Unter Vorbereitung", farbe: "#6b7280" }
];

// Startbestand an Bus-Optionen — keine Personendaten. Echte Trainer/Spieltermine
// kommen ausschließlich per einmaligem Cloud-Import in die Nextcloud, nie ins Repo.
const DEFAULT_BUSOPTIONEN = [
  { id: "stadtbus", name: "Stadtbus", regeln: "" },
  { id: "villa-lampe", name: "Villa Lampe", regeln: "" },
  { id: "laerz-weiss", name: "Lärz & Weiß", regeln: "" },
  { id: "sch-bus-hig", name: "SCH-Bus HIG SC911", regeln: "" },
  { id: "sch-bus-eic", name: "SCH-Bus EIC SC911", regeln: "" },
  { id: "eltern", name: "Eltern / Privatfahrer", regeln: "" },
  { id: "vw-autohaus", name: "VW Autohaus (Leihwagen)", regeln: "" }
];

// Startbestand an Mannschaften (Name/Liga sind keine Personendaten). Trainer und
// tatsächliche Spieltermine kommen per Cloud-Import (siehe oben) — hier bewusst leer.
const DEFAULT_TEAMS = [
  { id: "a-jugend", name: "A-Jugend", liga: "Verbandsliga", busOptionIds: ["stadtbus", "villa-lampe", "sch-bus-hig", "sch-bus-eic", "eltern"] },
  { id: "b-jugend", name: "B-Jugend", liga: "Verbandsliga", busOptionIds: ["stadtbus", "villa-lampe", "sch-bus-hig", "sch-bus-eic", "eltern", "vw-autohaus"] },
  { id: "c-jugend", name: "C-Jugend", liga: "Verbandsliga", busOptionIds: ["stadtbus", "laerz-weiss", "villa-lampe", "sch-bus-hig", "sch-bus-eic", "eltern"] },
  { id: "c2-jugend", name: "C2-Jugend", liga: "Kreisoberliga", busOptionIds: ["stadtbus", "laerz-weiss", "villa-lampe", "sch-bus-hig", "sch-bus-eic", "eltern"] },
  { id: "d1-jugend", name: "D1-Jugend", liga: "Verbandsliga", busOptionIds: ["stadtbus", "laerz-weiss", "villa-lampe", "sch-bus-hig", "sch-bus-eic", "eltern", "vw-autohaus"] },
  { id: "d2-jugend", name: "D2-Jugend", liga: "Verbandsliga", busOptionIds: ["stadtbus", "laerz-weiss", "villa-lampe", "sch-bus-hig", "sch-bus-eic", "eltern"] }
];

const APP_CHANGELOG = [
  {
    version: "1.5",
    groups: [
      {
        title: "Mannschaften kommen aus der Vereinsliste",
        items: [
          "Beim Anlegen einer Mannschaft schlägt das Namensfeld jetzt die echten Mannschaften des Vereins vor — die Liste, die in der Tools-Übersicht unter Einstellungen → Mannschaften gepflegt wird. Wählst du eine aus, wird die Liga gleich mit eingetragen.",
          "Du kannst weiterhin einen eigenen Namen tippen. Für Sonderfahrten oder eine gemeinsame Fahrt mit einem Gastverein gibt es hier ja keine Vereinsmannschaft.",
          "Neuer Knopf „↧ Aus Vereinsliste" über den Mannschafts-Reitern: holt die Mannschaften, die es im Verein gibt, hier aber noch nicht. Vorhandene bleiben unangetastet — Spiele, Busse und Status gehen nicht verloren. Der Knopf erscheint nur, wenn wirklich etwas fehlt.",
          "Eine neue Saison startet ebenfalls mit den Mannschaften aus der Vereinsliste statt mit der alten festen Aufstellung (A-Jugend, B-Jugend …).",
          "Aufgelöste Mannschaften werden nicht mehr vorgeschlagen."
        ]
      }
    ]
  },
  {
    version: "1.0",
    groups: [
      {
        title: "Busplan",
        items: [
          "Transportplanung für die Auswärtsspiele der Nachwuchsmannschaften — an Stelle der bisherigen Excel-Tabelle.",
          "Je Mannschaft eine Liste der Auswärtsspiele mit Status für jede Transport-Möglichkeit: Stadtbus, Busunternehmen, vereinseigene Busse, Eltern, Leihwagen.",
          "Status je Spiel und Option: Zusage, Absage, offen, in Klärung oder in Vorbereitung — jeweils mit optionaler Notiz, etwa für eine gemeinsame Fahrt mit einer anderen Mannschaft.",
          "Mehrere Saisons planbar: anlegen, duplizieren, löschen.",
          "Mannschaften und Bus-Optionen sind je Saison frei konfigurierbar, weil sich das Angebot halbjährlich ändert.",
          "Die Mannschafts-Reiter lassen sich per Ziehen neu anordnen. Die Reihenfolge gilt danach überall: in der Übersicht, in der Liste und im PDF."
        ]
      },
      {
        title: "Konflikte werden erkannt",
        items: [
          "Nutzen zwei Mannschaften dieselbe Bus-Option am selben Tag, markiert die App das als Konflikt — mit Warnsymbol direkt am Status und gesammelt in einer eigenen Karte in der Übersicht.",
          "Beim Setzen eines Status auf einen bereits belegten Tag kommt zusätzlich eine Rückfrage. Speichern ist trotzdem möglich, etwa wenn zwei Mannschaften bewusst zusammen fahren."
        ]
      },
      {
        title: "Bus-Regeln",
        items: [
          "Eigener Reiter „Bus-Regeln“: zu jeder Bus-Option lässt sich ein Freitext hinterlegen — Buchungsfrist, Personenzahl, Abfahrtsort und was sonst zu beachten ist.",
          "Die Regeln kann jeder angemeldete Nutzer lesen; ändern dürfen sie Bearbeiter.",
          "Ist eine Regel hinterlegt, erscheint ein Hinweiszeichen an der zugehörigen Spalte im Busplan; der Text steht als Tooltip dahinter.",
          "Das Eingabefeld wächst mit dem Text mit — auch lange Regeln stehen vollständig da, ohne im Feld zu scrollen."
        ]
      },
      {
        title: "Wer darf was",
        items: [
          "Sehen: den kompletten Plan einschließlich Bus-Regeln, schreibgeschützt.",
          "Bearbeiten: Mannschaften, Spiele und Bus-Optionen anlegen, ändern und löschen, Status setzen, Regeln pflegen. Dazu der PDF-Export.",
          "Administrieren: zusätzlich Saisonverwaltung und Daten-Import im Reiter „Einstellungen“.",
          "Der Reiter „Info“ ist für alle sichtbar."
        ]
      },
      {
        title: "Ausdruck",
        items: [
          "Der Knopf „Als PDF“ in der Übersicht druckt den Stand der laufenden Saison: Kennzahlen, die Konfliktliste und je Mannschaft eine Tabelle mit allen Spielen und dem Status jeder Bus-Option.",
          "Die Status-Farben aus dem Bildschirm bleiben im Ausdruck erhalten."
        ]
      },
      {
        title: "Bedienung am Handy",
        items: [
          "Die Ansicht ist für das Handy gebaut und funktioniert dort vollständig.",
          "Eingabefelder sind mindestens 16 Pixel groß, damit der iPhone-Browser beim Antippen nicht ungefragt in die Seite hineinzoomt und verschoben stehen bleibt.",
          "Das Umsortieren der Mannschafts-Reiter per Ziehen braucht eine Maus und geht am Handy nicht."
        ]
      },
      {
        title: "Daten & Speicherung",
        items: [
          "Gespeichert wird in der Vereins-Nextcloud über die zentrale Anmeldung der Tools-Übersicht — ein eigenes Passwort braucht es nicht.",
          "Ändern zwei Geräte gleichzeitig denselben Stand, erkennt die App das, lädt den fremden Stand nach und sagt Bescheid."
        ]
      }
    ]
  }
];
