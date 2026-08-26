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
// `abfragbar` steuert die Busabfrage im Tab „Bus frei?“: nur ein Eintrag mit
// Häkchen wird als frei oder belegt geführt und kann angefragt werden. Gedacht
// ist das für echte einzelne Fahrzeuge — „Eltern / Privatfahrer“ ist keines und
// kann an einem Tag nicht „belegt“ sein, steht deshalb hier auf false.
// Fehlt das Feld an einem bestehenden Eintrag, gilt er als abfragbar.
const DEFAULT_BUSOPTIONEN = [
  { id: "stadtbus", name: "Stadtbus", regeln: "", abfragbar: true },
  { id: "villa-lampe", name: "Villa Lampe", regeln: "", abfragbar: true },
  { id: "laerz-weiss", name: "Lärz & Weiß", regeln: "", abfragbar: true },
  { id: "sch-bus-hig", name: "SCH-Bus HIG SC911", regeln: "", abfragbar: true },
  { id: "sch-bus-eic", name: "SCH-Bus EIC SC911", regeln: "", abfragbar: true },
  { id: "eltern", name: "Eltern / Privatfahrer", regeln: "", abfragbar: false },
  { id: "vw-autohaus", name: "VW Autohaus (Leihwagen)", regeln: "", abfragbar: true }
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
    version: "1.9",
    groups: [
      {
        title: "Beim Abmelden bleibt nichts stehen",
        items: [
          "Läuft die Anmeldung ab, während die App offen ist — zum Beispiel weil ein Speichern nach längerer Pause fehlschlägt —, erscheint wie bisher der Hinweis „bitte neu anmelden“.",
          "Neu ist: der Bildschirm dahinter wird jetzt auch geleert. Vorher wurde er nur unsichtbar gemacht, und alles Angezeigte blieb im Browser stehen — sichtbar für jeden, der sich an denselben Rechner setzt und nachschaut.",
          "Für dich ändert sich nichts: der Weg zurück war schon immer ein Neuladen der Seite."
        ]
      }
    ]
  },
  {
    version: "1.8",
    groups: [
      {
        title: "Am Handy",
        items: [
          "Bisher brach die Reiterleiste selbst um, die rechte Reiter-Gruppe darin aber nicht: Sie rutschte als ein Stück in die zweite Zeile und lief dort weiter über den rechten Rand hinaus. Jetzt bricht auch sie um, sobald sie zu breit wird. Zu sehen ist das nur, wenn genug Reiter nebeneinanderstehen — bis dahin sieht alles aus wie bisher."
        ]
      }
    ]
  },
  {
    version: "1.7",
    groups: [
      {
        title: "Ist an dem Tag noch ein Bus frei?",
        items: [
          "Neuer Reiter „Bus frei?“: Datum eintragen, und die App sagt für jeden Bus, ob er an dem Tag noch frei ist oder schon vergeben — samt der Mannschaft, die ihn hat, und dem Grund (Zusage, offen, in Klärung, in Vorbereitung).",
          "Mitgezählt werden alle Mannschaften der laufenden Saison. Eine Absage oder ein leeres Feld belegt nichts.",
          "Sind Regeln zu einem Bus hinterlegt, stehen sie gleich mit dabei — die Buchungsfrist sieht man also, bevor man anfragt.",
          "Die Knöpfe „Heute“ und „Morgen“ springen mit einem Griff auf den passenden Tag."
        ]
      },
      {
        title: "Welche Busse abgefragt werden",
        items: [
          "Im Reiter „Bus-Regeln“ hat jeder Bus jetzt ein Häkchen „In der Busabfrage führen“. Nur angehakte Busse tauchen in der Abfrage auf und können angefragt werden.",
          "Gedacht ist das für echte einzelne Fahrzeuge. „Eltern / Privatfahrer“ zum Beispiel ist kein einzelner Bus und kann an einem Tag nicht belegt sein — das Häkchen ist dort ab Werk aus.",
          "Setzen und wegnehmen dürfen das Häkchen nur Bearbeiter."
        ]
      },
      {
        title: "Einen Bus für einen Tag anfragen",
        items: [
          "Unter der Abfrage steht bei jedem freien Bus ein Knopf „Anfragen“. Mannschaft oder Anlass eintragen, kurz sagen wofür — fertig.",
          "Anfragen darf jeder, der den Busplan sehen kann. Man braucht dafür kein Bearbeiten-Recht.",
          "Alle Anfragen stehen als Liste im selben Reiter. Bearbeiter sagen dort zu oder ab und können eine kurze Antwort dazuschreiben.",
          "Eine zugesagte Anfrage belegt den Bus an dem Tag sofort mit — die nächste Abfrage zeigt ihn also nicht mehr als frei.",
          "Die eigene Anfrage lässt sich zurücknehmen, solange niemand entschieden hat. Offene Anfragen stehen zusätzlich als Karte in der Übersicht."
        ]
      }
    ]
  },
  {
    version: "1.6",
    groups: [
      {
        title: "Erinnerung an die zugesagte Fahrt",
        items: [
          "Drei Tage bevor eine Mannschaft ihren Bus hat, bekommen ihre Trainer automatisch eine Nachricht aufs Handy und eine E-Mail. Ausgelöst wird das nur von einer Zusage — bei offen, in Klärung oder in Vorbereitung passiert nichts.",
          "In der E-Mail stehen Tag, Ort und der zugesagte Bus, dazu die Bus-Regeln genau dieses Busses. Sind für ein Spiel zwei Busse zugesagt, nennt eine einzige Nachricht beide samt ihrer Regeln.",
          "Kommt eine Zusage erst kurz vorher, geht die Erinnerung trotzdem raus — in der Nacht danach. Doppelt kommt sie nie.",
          "Wer die Nachrichten aufs Handy nicht will, schaltet sie in der Tools-Übersicht unter „Mein Konto“ ab. Die E-Mail bleibt davon unberührt.",
          "Neu in der Übersicht: die Karte „Bus-Erinnerungen“ zeigt, wann der Versand zuletzt lief und wie viele Nachrichten rausgingen — und vor allem, für welche Mannschaft niemand erreichbar war."
        ]
      }
    ]
  },
  {
    version: "1.5",
    groups: [
      {
        title: "Mannschaften kommen aus der Vereinsliste",
        items: [
          "Beim Anlegen einer Mannschaft schlägt das Namensfeld jetzt die echten Mannschaften des Vereins vor — die Liste, die in der Tools-Übersicht unter Einstellungen → Mannschaften gepflegt wird. Wählst du eine aus, wird die Liga gleich mit eingetragen.",
          "Du kannst weiterhin einen eigenen Namen tippen. Für Sonderfahrten oder eine gemeinsame Fahrt mit einem Gastverein gibt es hier ja keine Vereinsmannschaft.",
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
