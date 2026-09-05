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
    version: "1.3",
    groups: [
      {
        title: "Fehlermeldung sagt jetzt, was wirklich fehlt",
        items: [
          "Wies der Server einen Zugriff ab, stand hier immer derselbe Satz: „Kein Zugriff auf dieses Tool.“ Dabei gibt es zwei ganz verschiedene Gründe — das Tool ist gar nicht freigegeben, oder es fehlt nur das Bearbeiten-Recht. Jetzt steht der Grund des Servers da. Nennt er keinen, bleibt es beim alten Satz."
        ]
      }
    ]
  },
  {
    version: "1.2",
    groups: [
      {
        title: "Saison umschalten geht jetzt auch ohne Bearbeiten-Recht",
        items: [
          "Wer den Busplan nur ansehen darf, bekam beim Wechsel der Saison im Kopf der Seite die Meldung „Speichern fehlgeschlagen: Kein Zugriff auf dieses Tool.“ — obwohl der Busplan vor ihm auf dem Bildschirm stand. Grund: die gewählte Saison wurde immer mitgespeichert, und Speichern ist Bearbeitern vorbehalten. Ab jetzt bleibt die Wahl bei einem Nur-Seher einfach lokal. Danach hing außerdem bei jedem Verlassen der Seite die Frage „Seite verlassen?“, weil der Fehler nie wieder wegging. Auch das ist erledigt."
        ]
      }
    ]
  },
  {
    version: "1.1",
    groups: [
      {
        title: "Anfragen und Erinnerungen stehen schneller",
        items: [
          "Nach dem ersten Aufbau wurden Mannschaftsliste, Erinnerungsbericht und Bus-Anfragen bisher streng nacheinander geholt — drei Roundtrips, bis die Anfragen zu sehen waren. Jetzt laufen die drei gemeinsam los. Der Busplan selbst war davon nie betroffen, er stand schon vorher sofort."
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
          "Status je Spiel und Option: Zusage, Absage, offen, in Klärung oder Unter Vorbereitung — jeweils mit optionaler Notiz, etwa für eine gemeinsame Fahrt mit einer anderen Mannschaft.",
          "Mehrere Saisons planbar: anlegen, duplizieren, löschen. Mannschaften und Bus-Optionen sind je Saison frei konfigurierbar, weil sich das Angebot halbjährlich ändert.",
          "Beim Anlegen einer Mannschaft schlägt das Namensfeld die echten Mannschaften des Vereins vor — die Liste, die in der Tools-Übersicht unter Einstellungen → Mannschaften gepflegt wird. Wählst du eine aus, wird die Liga gleich mit eingetragen. Aufgelöste Mannschaften werden nicht vorgeschlagen.",
          "Ein eigener Name lässt sich weiterhin tippen. Für Sonderfahrten oder eine gemeinsame Fahrt mit einem Gastverein gibt es ja keine Vereinsmannschaft.",
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
        title: "Ist an dem Tag noch ein Bus frei?",
        items: [
          "Der Reiter „Bus frei?“ beantwortet die Frage vor dem Zusagen: Datum eintragen, und für jeden Bus steht da, ob er an dem Tag noch frei oder schon vergeben ist — samt der Mannschaft, die ihn hat, und dem Grund (Zusage, offen, in Klärung, Unter Vorbereitung). Eine Absage oder ein leeres Feld belegt nichts.",
          "Die Knöpfe „Heute“ und „Morgen“ springen mit einem Griff auf den passenden Tag. Sind zu einem Bus Regeln hinterlegt, stehen sie gleich mit dabei — die Buchungsfrist sieht man also, bevor man anfragt.",
          "Im Reiter „Bus-Regeln“ hat jeder Bus ein Häkchen „In der Busabfrage führen“. Nur angehakte Busse tauchen in der Abfrage auf und können angefragt werden. Gedacht ist das für echte einzelne Fahrzeuge: „Eltern / Privatfahrer“ etwa ist kein einzelner Bus und kann an einem Tag nicht belegt sein.",
          "Unter der Abfrage steht bei jedem freien Bus ein Knopf „Anfragen“: Mannschaft oder Anlass eintragen, kurz sagen wofür — fertig. Anfragen darf jeder, der den Busplan sehen kann; ein Bearbeiten-Recht braucht es dafür nicht.",
          "Alle Anfragen stehen als Liste im selben Reiter. Bearbeiter sagen dort zu oder ab und können eine kurze Antwort dazuschreiben. Eine zugesagte Anfrage belegt den Bus an dem Tag sofort mit — die nächste Abfrage zeigt ihn also nicht mehr als frei.",
          "Die eigene Anfrage lässt sich zurücknehmen, solange niemand entschieden hat. Offene Anfragen stehen zusätzlich als Karte in der Übersicht."
        ]
      },
      {
        title: "Bus-Regeln",
        items: [
          "Eigener Reiter „Bus-Regeln“: zu jeder Bus-Option lässt sich ein Freitext hinterlegen — Buchungsfrist, Personenzahl, Abfahrtsort und was sonst zu beachten ist. So steht es einmal da, statt jedes Mal nachgefragt zu werden.",
          "Die Regeln kann jeder angemeldete Nutzer lesen; ändern dürfen sie Bearbeiter.",
          "Ist eine Regel hinterlegt, erscheint ein Hinweiszeichen an der zugehörigen Spalte im Busplan; der Text steht als Tooltip dahinter.",
          "Das Eingabefeld wächst mit dem Text mit — auch lange Regeln stehen vollständig da, ohne im Feld zu scrollen."
        ]
      },
      {
        title: "Erinnerung an die zugesagte Fahrt",
        items: [
          "Drei Tage bevor eine Mannschaft ihren Bus hat, bekommen ihre Trainer automatisch eine Nachricht aufs Handy und eine E-Mail. Ausgelöst wird das nur von einer Zusage — bei offen, in Klärung oder Unter Vorbereitung passiert nichts.",
          "In der E-Mail stehen Tag, Ort und der zugesagte Bus, dazu die Bus-Regeln genau dieses Busses. Sind für ein Spiel zwei Busse zugesagt, nennt eine einzige Nachricht beide samt ihrer Regeln.",
          "Kommt eine Zusage erst kurz vorher, geht die Erinnerung trotzdem raus — in der Nacht danach. Doppelt kommt sie nie.",
          "Wer die Nachrichten aufs Handy nicht will, schaltet sie in der Tools-Übersicht unter „Mein Konto“ ab. Die E-Mail bleibt davon unberührt.",
          "Die Karte „Bus-Erinnerungen“ in der Übersicht zeigt, wann der Versand zuletzt lief und wie viele Nachrichten rausgingen — und vor allem, für welche Mannschaft niemand erreichbar war."
        ]
      },
      {
        title: "Liste und Ausdruck",
        items: [
          "Der Reiter „Liste“ zeigt dieselben Fahrten quer über alle Mannschaften als flache Liste — mit Suchfeld nach Mannschaft oder Ort und einem Filter auf eine einzelne Mannschaft.",
          "Der Knopf „Als PDF“ in der Übersicht druckt den Stand der laufenden Saison: Kennzahlen, die Konfliktliste und je Mannschaft eine Tabelle mit allen Spielen und dem Status jeder Bus-Option.",
          "Die Status-Farben aus dem Bildschirm bleiben im Ausdruck erhalten."
        ]
      },
      {
        title: "Wer darf was",
        items: [
          "Sehen: den kompletten Plan einschließlich Liste, Belegung und Bus-Regeln, schreibgeschützt. Einen Bus anfragen darf diese Stufe ausdrücklich auch.",
          "Bearbeiten: Mannschaften, Spiele und Bus-Optionen anlegen, ändern und löschen, Status setzen, Regeln pflegen, über Anfragen entscheiden. Dazu der PDF-Export.",
          "Administrieren: zusätzlich Saisonverwaltung und Daten-Import im Reiter „Einstellungen“.",
          "Der Reiter „Info“ ist für alle sichtbar."
        ]
      },
      {
        title: "Daten, Speicherung und Bedienung am Handy",
        items: [
          "Gespeichert wird in der Vereins-Nextcloud über die zentrale Anmeldung der Tools-Übersicht — ein eigenes Passwort braucht es nicht.",
          "Ändern zwei Geräte gleichzeitig denselben Stand, erkennt die App das, lädt den fremden Stand nach und sagt Bescheid.",
          "Läuft die Anmeldung ab, während die App offen ist, erscheint der Hinweis „bitte neu anmelden“ — und der Bildschirm dahinter wird geräumt, samt aller Dialoge und der Druckansicht. Es bleibt nichts stehen, in das sich jemand am selben Rechner hineinlesen könnte.",
          "Die Ansicht ist für das Handy gebaut und funktioniert dort vollständig. Eingabefelder sind mindestens 16 Pixel groß, damit der iPhone-Browser beim Antippen nicht ungefragt in die Seite hineinzoomt.",
          "Das Umsortieren der Mannschafts-Reiter per Ziehen braucht eine Maus und geht am Handy nicht."
        ]
      }
    ]
  }
];
