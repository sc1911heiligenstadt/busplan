// Persistenz über das zentrale ToolsUebersicht-Login-Gateway.
// Gleiches Gateway-Muster wie E:\platzbelegung\db.js — reines Gateway ohne
// lokalen Datei-Modus.
const GATEWAY_URL = "https://landingpage.michel-brunner.workers.dev";
const TOKEN_STORAGE_KEY = "tu_session_token";
const GATEWAY_APP_ID = "busplan";

class NotLoggedInError extends Error {
  constructor(message) {
    super(message || "Nicht angemeldet");
    this.name = "NotLoggedInError";
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message || "Daten wurden zwischenzeitlich von einem anderen Gerät geändert");
    this.name = "ConflictError";
  }
}

// ETag des zuletzt geladenen/geschriebenen Stands. Wird bei dav-save mitgeschickt,
// damit der Worker Konflikte (anderes Gerät hat inzwischen gespeichert) erkennt.
let gatewayRev = null;

function getSessionToken() {
  try { return localStorage.getItem(TOKEN_STORAGE_KEY); } catch (_) { return null; }
}

async function gatewayRequest(payload) {
  const token = getSessionToken();
  if (!token) throw new NotLoggedInError();
  const resp = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify(payload)
  });
  if (resp.status === 401) throw new NotLoggedInError("Sitzung abgelaufen");
  if (resp.status === 403) throw new Error("Kein Zugriff auf dieses Tool.");
  if (resp.status === 409) throw new ConflictError();
  if (!resp.ok) {
    let detail = "";
    try { const b = await resp.json(); if (b && b.error) detail = ": " + b.error; } catch (_) {}
    throw new Error(`Gateway-Fehler (HTTP ${resp.status})${detail}`);
  }
  return resp.json();
}

// Das "me" aus der letzten dav-load-Antwort. Der Worker legt es bei, weil er
// nutzer.json und die Rechte-Datei fuer diesen Request ohnehin gelesen hat --
// der erste fetchMe() nach dem Laden kommt damit ohne eigenen Roundtrip aus.
let gatewayMe = null;

async function gatewayLoad() {
  const body = await gatewayRequest({ action: "dav-load", app: GATEWAY_APP_ID });
  gatewayRev = typeof body.rev === "string" ? body.rev : null;
  gatewayMe = (body.me && typeof body.me === "object") ? body.me : null;
  return body.data; // Objekt oder null (Datei noch nicht vorhanden)
}

async function gatewaySave(dataObj) {
  const payload = { action: "dav-save", app: GATEWAY_APP_ID, data: dataObj };
  if (gatewayRev) payload.rev = gatewayRev;
  const body = await gatewayRequest(payload);
  gatewayRev = typeof body.rev === "string" ? body.rev : null;
}

// Letzter Rettungsversuch beim Verlassen der Seite. Ein normaler fetch wird beim
// Entladen abgebrochen -- mit keepalive ueberlebt der Request das Schliessen des
// Tabs. Betrifft zwei Faelle: einen noch nicht abgelaufenen Debounce-Timer und
// einen gerade laufenden Schreibvorgang.
// Bewusst MIT gatewayRev: ein unbedingter Schreibvorgang wuerde hier zwar immer
// durchgehen, koennte aber die Aenderung eines anderen Geraets ueberschreiben,
// ohne dass es jemand merkt. Lieber ein wirkungsloser 409 als stiller fremder
// Datenverlust.
//
// Grenze: Browser erlauben fuer keepalive-Requests nur 64 KB Body. Groessere
// Datenbestaende gehen auf diesem Weg gar nicht raus -- deshalb meldet die
// Funktion zurueck, ob sie abschicken konnte; der Aufrufer (beforeunload in
// app.js) fragt dann stattdessen nach.
const KEEPALIVE_MAX_BYTES = 64 * 1024;

function gatewaySaveBeacon(dataObj) {
  const token = getSessionToken();
  if (!token) return false;
  const payload = { action: "dav-save", app: GATEWAY_APP_ID, data: dataObj };
  if (gatewayRev) payload.rev = gatewayRev;
  const body = JSON.stringify(payload);
  if (new Blob([body]).size > KEEPALIVE_MAX_BYTES) return false;
  try {
    fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body,
      keepalive: true
    });
    return true;
  } catch (_) {
    return false; // z.B. wenn der Browser den keepalive-Request doch ablehnt
  }
}

// Liefert {username, isAdmin, groupIds, vorname, nachname, canEdit} der eingeloggten Person.
async function fetchMe() {
  // Genau EINMAL aus dem letzten dav-load bedienen, danach wieder echt fragen:
  // ein spaeterer Aufruf will den aktuellen Stand (etwa nach einem Rechte-
  // wechsel), nicht eine beliebig alte Kopie. Faellt von selbst auf den Request
  // zurueck, wenn der Worker das Feld noch nicht mitschickt.
  if (gatewayMe) { const me = gatewayMe; gatewayMe = null; return me; }
  return gatewayRequest({ action: "me", app: GATEWAY_APP_ID });
}

// Die Mannschaften des Vereins aus der zentralen Liste (seit 2026-08-12).
//
// Der Busplan fuehrt seine Mannschaften weiterhin SELBST -- an ihnen haengen
// Bus-Optionen, Spiele und Status, und es gibt Fahrten fuer Dinge, die keine
// Vereinsmannschaft sind (Sonderfahrt, gemeinsame Fahrt mit einem Gastverein).
// Diese Liste ist deshalb ein VORSCHLAG, keine Schranke: sie fuellt die
// Auswahl beim Anlegen und den Startbestand einer neuen Saison, aber ein frei
// getippter Name bleibt jederzeit moeglich.
//
// ⚠️ Wirft nicht nach oben durch. Ohne die Liste laeuft der Busplan wie vorher
// weiter -- sie ist Komfort, keine Voraussetzung.
async function fetchVereinsMannschaften() {
  try {
    const body = await gatewayRequest({ action: "mannschaften-load" });
    const teams = (body && Array.isArray(body.teams)) ? body.teams : [];
    // Archivierte sind aufgeloeste Mannschaften -- fuer eine neue Saison soll
    // sie niemand mehr vorgeschlagen bekommen.
    return teams
      .filter((t) => t && t.kurz && !t.archiviert)
      .map((t) => ({ kurz: String(t.kurz), lang: String(t.lang || t.kurz), liga: String(t.liga || "") }));
  } catch (e) {
    console.warn("Vereins-Mannschaftsliste nicht ladbar", e);
    return [];
  }
}
