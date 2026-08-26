// ---------- Helpers ----------
function uuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "bxxxxxxxx".replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function clone(o) { return JSON.parse(JSON.stringify(o)); }
function val(id) { const el = document.getElementById(id); return el ? el.value : ""; }

// Status-Werte, die einen Bus tatsächlich belegen (für die Konflikt-Prüfung) —
// "" (leer) und "absage" schließen eine Nutzung explizit aus.
const CONFLICT_STATUS_IDS = STATUS_WERTE.filter((s) => s.id && s.id !== "absage").map((s) => s.id);

const WOCHENTAGE_KURZ = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
function fmtDatum(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  const wd = WOCHENTAGE_KURZ[d.getDay()];
  return `${wd}, ${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

// ---------- State ----------
let appData = { meta: {}, seasons: {} };
let currentUser = null;
// Die Mannschaften des Vereins aus der zentralen Liste (seit 2026-08-12).
// VORSCHLAG, keine Schranke: sie füllt die Auswahl beim Anlegen und den
// Startbestand einer neuen Saison. Eigene Namen bleiben frei tippbar — im
// Busplan gibt es Fahrten, die zu keiner Vereinsmannschaft gehören.
let vereinsMannschaften = [];
let currentTab = "uebersicht";
let currentTeamId = null;
let editingTeamId = null;
let editingSpiel = { teamId: null, id: null };
let editingStatus = { teamId: null, spielId: null, optionId: null };
let persistTimer = null;

// ---------- Normalisierung ----------
function normalizeStatusEintrag(s) {
  const d = s && typeof s === "object" ? s : {};
  const wert = STATUS_WERTE.some((w) => w.id === d.wert) ? d.wert : "";
  return { wert, notiz: typeof d.notiz === "string" ? d.notiz : "" };
}
function normalizeSpiel(s, optionIds) {
  const d = s && typeof s === "object" ? s : {};
  const status = {};
  optionIds.forEach((oid) => { status[oid] = normalizeStatusEintrag(d.status && d.status[oid]); });
  return {
    id: d.id || uuid(),
    datum: typeof d.datum === "string" ? d.datum : "",
    ort: typeof d.ort === "string" ? d.ort : "",
    notiz: typeof d.notiz === "string" ? d.notiz : "",
    status
  };
}
function normalizeTeam(t, validOptionIds) {
  const d = t && typeof t === "object" ? t : {};
  const busOptionIds = Array.isArray(d.busOptionIds) ? d.busOptionIds.filter((id) => validOptionIds.includes(id)) : [];
  return {
    id: d.id || uuid(),
    name: typeof d.name === "string" ? d.name : "",
    liga: typeof d.liga === "string" ? d.liga : "",
    trainer: typeof d.trainer === "string" ? d.trainer : "",
    busOptionIds,
    spiele: Array.isArray(d.spiele) ? d.spiele.map((s) => normalizeSpiel(s, busOptionIds)) : []
  };
}
function normalizeBusOptionen(arr) {
  if (!Array.isArray(arr)) return [];
  // abfragbar (seit 2026-08-19): steuert, ob die Bus-Option in der Busabfrage
  // als frei/belegt gefuehrt und angefragt werden kann. Ein FEHLENDES Feld gilt
  // als abfragbar -- bestehende Optionen sollen nach dem Update nicht alle aus
  // der Abfrage fallen. Gleiche Vorgabe im Worker (busplanOptionPruefen).
  return arr.filter((o) => o && typeof o === "object" && o.id && o.name).map((o) => ({ id: String(o.id), name: String(o.name), regeln: typeof o.regeln === "string" ? o.regeln : "", abfragbar: o.abfragbar !== false }));
}
function seedSeason() {
  const busOptions = clone(DEFAULT_BUSOPTIONEN);
  const ids = busOptions.map((o) => o.id);
  // ⚠️ Seit 2026-08-12 kommt der Startbestand aus der ZENTRALEN Mannschaftsliste,
  // wenn sie geladen ist. DEFAULT_TEAMS in config.js ist nur noch der Rückfall
  // für den Fall, dass die Liste (noch) nicht erreichbar ist -- die Namen dort
  // ("A-Jugend", "D1-Jugend") sind eine eigene, alte Schreibweise und würden
  // sonst genau das Durcheinander neu anlegen, das gerade aufgeräumt wurde.
  if (vereinsMannschaften.length) {
    return {
      busOptions,
      teams: vereinsMannschaften.map((m) => ({
        id: uuid(), name: m.kurz, liga: m.liga, trainer: "",
        // Welche Busse für welche Mannschaft in Frage kommen, ist eine
        // Entscheidung je Saison -- die kann die Vereinsliste nicht kennen.
        busOptionIds: [], spiele: []
      }))
    };
  }
  const teams = clone(DEFAULT_TEAMS).map((t) => ({
    id: t.id, name: t.name, liga: t.liga, trainer: "",
    busOptionIds: t.busOptionIds.filter((id) => ids.includes(id)),
    spiele: []
  }));
  return { busOptions, teams };
}
function normalizeSeason(s) {
  if (!s || typeof s !== "object") return seedSeason();
  const busOptions = normalizeBusOptionen(s.busOptions);
  const ids = busOptions.map((o) => o.id);
  const teams = Array.isArray(s.teams) ? s.teams.map((t) => normalizeTeam(t, ids)) : [];
  return { busOptions, teams };
}
function normalizeData(data) {
  const d = data && typeof data === "object" ? data : {};
  const seasons = {};
  const src = d.seasons && typeof d.seasons === "object" ? d.seasons : {};
  Object.keys(src).forEach((k) => { seasons[k] = normalizeSeason(src[k]); });
  if (Object.keys(seasons).length === 0) {
    seasons[DEFAULT_SEASON] = seedSeason();
  }
  const meta = d.meta && typeof d.meta === "object" ? Object.assign({}, d.meta) : {};
  if (!meta.currentSeason || !seasons[meta.currentSeason]) meta.currentSeason = Object.keys(seasons)[0];
  return { meta, seasons };
}

// ---------- Zugriff ----------
function currentSeasonKey() { return appData.meta.currentSeason; }
function getSeason() { return appData.seasons[currentSeasonKey()]; }
function currentTeam() { return getSeason().teams.find((t) => t.id === currentTeamId) || null; }

function canEdit() {
  if (!currentUser) return false;
  return currentUser.isAdmin || !!currentUser.canEdit;
}

// ---------- Übersicht ----------
function statusCounts() {
  const season = getSeason();
  const counts = {};
  STATUS_WERTE.forEach((s) => { counts[s.id] = 0; });
  season.teams.forEach((t) => t.spiele.forEach((sp) => t.busOptionIds.forEach((oid) => {
    const wert = sp.status[oid] ? sp.status[oid].wert : "";
    counts[wert] = (counts[wert] || 0) + 1;
  })));
  return counts;
}
function renderSummary() {
  const season = getSeason();
  const counts = statusCounts();
  const totalSpiele = season.teams.reduce((a, t) => a + t.spiele.length, 0);
  const cards = [
    { label: "Mannschaften", value: season.teams.length },
    { label: "Spiele gesamt", value: totalSpiele },
    { label: "Zusagen", value: counts.zusage || 0, strong: true },
    { label: "Offen / in Klärung", value: (counts.offen || 0) + (counts.klaerung || 0) },
    { label: "Absagen", value: counts.absage || 0 }
  ];
  document.getElementById("summary-cards").innerHTML = cards.map((c) => `
    <div class="summary-card${c.strong ? " strong" : ""}">
      <div class="sc-label">${escapeHtml(c.label)}</div>
      <div class="sc-value">${escapeHtml(String(c.value))}</div>
    </div>`).join("");

  const rows = season.teams.map((t) => {
    const offen = t.spiele.reduce((a, sp) => a + t.busOptionIds.filter((oid) => ["offen", "klaerung"].includes((sp.status[oid] || {}).wert)).length, 0);
    return `<tr class="data-row" data-team="${escapeHtml(t.id)}">
      <td class="strong">${escapeHtml(t.name)}</td>
      <td>${escapeHtml(t.liga)}</td>
      <td class="num">${t.spiele.length}</td>
      <td class="num">${offen ? `<span class="badge">${offen}</span>` : "0"}</td>
    </tr>`;
  }).join("");
  document.querySelector("#uebersicht-teams tbody").innerHTML = rows;
  document.getElementById("uebersicht-empty").classList.toggle("hidden", season.teams.length > 0);
}

// ---------- Nachlese zum naechtlichen Erinnerungslauf ----------
//
// ⚠️ Ein ausbleibendes Push faellt NIEMANDEM auf. Deshalb steht hier nicht nur
// "hat funktioniert", sondern vor allem, WER leer ausgegangen waere: eine
// Mannschaft ohne zugeordnetes Trainerkonto oder ohne hinterlegte Adresse.
// Ohne diese Zeilen wartet jemand auf eine Nachricht, die es nie geben wird.
let erinnerungsBericht = null;

function renderErinnerungen() {
  const el = document.getElementById("erinnerungen-status");
  if (!el) return;

  if (!erinnerungsBericht) {
    el.innerHTML = `Der Stand des nächtlichen Laufs ist gerade nicht abrufbar.`;
    return;
  }
  const lauf = erinnerungsBericht.lauf;
  if (!lauf) {
    el.innerHTML = `Der nächtliche Lauf hat sich noch nicht gemeldet. Das ist normal, solange
      keine Fahrt innerhalb der nächsten ${escapeHtml(String(erinnerungsBericht.vorlaufTage || 3))} Tage
      eine Zusage hat.`;
    return;
  }

  const wann = lauf.zuletztAm ? new Date(lauf.zuletztAm).toLocaleString("de-DE") : "unbekannt";
  const teile = [
    `<div>Zuletzt gelaufen: <strong>${escapeHtml(wann)}</strong> —
      ${escapeHtml(String(lauf.fahrten || 0))} Fahrt(en),
      ${escapeHtml(String(lauf.push || 0))} Handy-Nachricht(en),
      ${escapeHtml(String(lauf.mails || 0))} E-Mail(s).</div>`
  ];
  if (lauf.fehler) {
    teile.push(`<div class="warn-line">⚠️ Fehler beim letzten Lauf: ${escapeHtml(String(lauf.fehler))}</div>`);
  }
  const ohneTrainer = Array.isArray(lauf.ohneTrainer) ? lauf.ohneTrainer : [];
  if (ohneTrainer.length) {
    teile.push(`<div class="warn-line">⚠️ Kein Trainerkonto zugeordnet, deshalb ohne Erinnerung:
      <strong>${escapeHtml(ohneTrainer.join(", "))}</strong>.
      Die Zuordnung läuft über das Profil des Trainers in der Toolübersicht (Feld Mannschaften),
      nicht über das Trainer-Feld hier im Busplan.</div>`);
  }
  const ohneAdresse = Array.isArray(lauf.ohneAdresse) ? lauf.ohneAdresse : [];
  if (ohneAdresse.length) {
    teile.push(`<div class="warn-line">⚠️ Handy-Nachricht ging raus, E-Mail nicht — beim Trainer
      fehlt eine Adresse in den Trainerdaten: <strong>${escapeHtml(ohneAdresse.join(", "))}</strong>.</div>`);
  }
  el.innerHTML = teile.join("");
}

// ---------- Konflikt-Prüfung ----------
// Gruppiert alle Spiele der aktuellen Saison nach (Datum, Bus-Option). Eine Gruppe
// mit >=2 Einträgen ist ein Konflikt — auch innerhalb derselben Mannschaft (zwei
// Spiele am selben Tag, die denselben Bus bräuchten).
function findConflictGroups() {
  const season = getSeason();
  const groups = {};
  season.teams.forEach((t) => t.spiele.forEach((sp) => {
    if (!sp.datum) return;
    t.busOptionIds.forEach((oid) => {
      const st = sp.status[oid];
      if (!st || !CONFLICT_STATUS_IDS.includes(st.wert)) return;
      const key = sp.datum + "|" + oid;
      if (!groups[key]) groups[key] = { datum: sp.datum, optionId: oid, entries: [] };
      groups[key].entries.push({ teamId: t.id, teamName: t.name, spielId: sp.id, ort: sp.ort, wert: st.wert });
    });
  }));
  return Object.values(groups).filter((g) => g.entries.length >= 2);
}
// Lookup-Map "teamId|spielId|optionId" -> die JEWEILS ANDEREN Konflikt-Partner (für die Gitter-Zelle).
function conflictMapFromGroups(groups) {
  const map = {};
  groups.forEach((g) => {
    g.entries.forEach((e) => {
      map[`${e.teamId}|${e.spielId}|${g.optionId}`] = g.entries.filter((o) => o !== e);
    });
  });
  return map;
}
function renderKonflikte() {
  const groups = findConflictGroups().sort((a, b) => a.datum.localeCompare(b.datum));
  const card = document.getElementById("konflikte-card");
  card.classList.toggle("hidden", groups.length === 0);
  if (!groups.length) return;
  const season = getSeason();
  document.getElementById("konflikte-list").innerHTML = groups.map((g) => {
    const option = season.busOptions.find((o) => o.id === g.optionId);
    const teamsText = g.entries.map((e) => `${escapeHtml(e.teamName)} (${escapeHtml(e.ort || "Ort offen")})`).join(" + ");
    return `<div class="konflikt-row" data-team="${escapeHtml(g.entries[0].teamId)}">
      <span class="lr-strong">${escapeHtml(fmtDatum(g.datum))}</span>
      <span>${escapeHtml(option ? option.name : g.optionId)}</span>
      <span>${teamsText}</span>
    </div>`;
  }).join("");
}

// ---------- Busplan-Tab ----------
function renderTeamSwitch() {
  const season = getSeason();
  if (!season.teams.some((t) => t.id === currentTeamId)) currentTeamId = season.teams[0] ? season.teams[0].id : null;
  const editable = canEdit();
  document.getElementById("team-switch").innerHTML = season.teams.map((t) =>
    `<button data-team="${escapeHtml(t.id)}" class="${t.id === currentTeamId ? "active" : ""}"${editable ? ' draggable="true"' : ""}>${escapeHtml(t.name)}</button>`
  ).join("");
}
function selectTeam(id) {
  currentTeamId = id;
  renderTeamSwitch();
  renderBusplanGrid();
}
// Sortierung der Mannschafts-Reiter per Drag-and-Drop (nur Bearbeiter/Admin,
// siehe draggable-Attribut in renderTeamSwitch). Eingefügtes Team übernimmt die
// Index-Position des Drop-Ziels, alle anderen Teams behalten ihre Reihenfolge —
// wirkt sich auf jede Ansicht aus, die season.teams in Array-Reihenfolge zeigt
// (Übersicht-Tabelle, Liste-Filter, PDF-Export).
function reorderTeams(draggedId, targetId) {
  if (!canEdit() || !draggedId || draggedId === targetId) return;
  const season = getSeason();
  const from = season.teams.findIndex((t) => t.id === draggedId);
  const to = season.teams.findIndex((t) => t.id === targetId);
  if (from === -1 || to === -1) return;
  const [moved] = season.teams.splice(from, 1);
  season.teams.splice(to, 0, moved);
  persist();
  renderTeamSwitch();
}
function renderBusplanGrid() {
  const team = currentTeam();
  const wrap = document.getElementById("busplan-grid-wrap");
  const info = document.getElementById("busplan-team-info");
  const card = document.getElementById("busplan-team-card");
  const empty = document.getElementById("busplan-empty");
  const btnNewSpiel = document.getElementById("btn-new-spiel");
  if (!team) {
    wrap.innerHTML = "";
    card.classList.add("hidden");
    empty.classList.remove("hidden");
    btnNewSpiel.classList.add("hidden");
    return;
  }
  card.classList.remove("hidden");
  empty.classList.add("hidden");
  btnNewSpiel.classList.toggle("hidden", !canEdit());
  const season = getSeason();
  const options = team.busOptionIds.map((id) => season.busOptions.find((o) => o.id === id)).filter(Boolean);
  info.innerHTML = `<div class="form-grid">
    <div class="form-field"><label>Liga</label><span>${escapeHtml(team.liga || "—")}</span></div>
    <div class="form-field"><label>Trainer</label><span>${escapeHtml(team.trainer || "—")}</span></div>
  </div>`;
  const spiele = team.spiele.slice().sort((a, b) => (a.datum || "").localeCompare(b.datum || ""));
  const conflictMap = conflictMapFromGroups(findConflictGroups());
  const editorCol = canEdit() ? "<th></th>" : "";
  const theadHtml = `<tr><th>Datum</th><th>Ort</th>${options.map((o) => `<th${o.regeln ? ` title="${escapeHtml(o.regeln)}"` : ""}>${escapeHtml(o.name)}${o.regeln ? " ℹ️" : ""}</th>`).join("")}<th>Notiz</th>${editorCol}</tr>`;
  const rowsHtml = spiele.map((sp) => {
    const cells = options.map((o) => {
      const st = sp.status[o.id] || { wert: "", notiz: "" };
      const def = STATUS_WERTE.find((s) => s.id === st.wert) || STATUS_WERTE[0];
      const partners = conflictMap[`${team.id}|${sp.id}|${o.id}`];
      const notizParts = [];
      if (st.notiz) notizParts.push(st.notiz);
      if (partners) notizParts.push("Konflikt: auch " + partners.map((p) => `${p.teamName} (${p.ort || "Ort offen"})`).join(", "));
      const title = notizParts.length ? ` title="${escapeHtml(notizParts.join(" — "))}"` : "";
      const clickable = canEdit() ? " is-clickable" : "";
      const conflictClass = partners ? " has-conflict" : "";
      return `<td><span class="status-badge${clickable}${conflictClass}" data-status-cell data-spiel="${escapeHtml(sp.id)}" data-option="${escapeHtml(o.id)}" style="background:${def.farbe}"${title}>${escapeHtml(def.label)}${st.notiz ? " 💬" : ""}${partners ? " ⚠️" : ""}</span></td>`;
    }).join("");
    const editorCell = canEdit() ? `<td><button class="icon-btn edit" data-edit-spiel="${escapeHtml(sp.id)}" title="Spiel bearbeiten">✎</button></td>` : "";
    return `<tr>
      <td class="strong">${escapeHtml(fmtDatum(sp.datum))}</td>
      <td>${escapeHtml(sp.ort)}</td>
      ${cells}
      <td class="muted">${escapeHtml(sp.notiz || "")}</td>
      ${editorCell}
    </tr>`;
  }).join("");
  if (spiele.length) {
    wrap.innerHTML = `<div class="table-scroll"><table class="data-table busplan-table"><thead>${theadHtml}</thead><tbody>${rowsHtml}</tbody></table></div>`;
  } else {
    wrap.innerHTML = `<div class="empty-state">Für diese Mannschaft sind noch keine Spiele erfasst.</div>`;
  }
}

// ---------- Mannschaft-Formular ----------
function openTeamModal(id) {
  if (!canEdit()) return;
  const season = getSeason();
  const t = id ? season.teams.find((x) => x.id === id) : null;
  editingTeamId = t ? t.id : null;
  document.getElementById("team-modal-title").textContent = t ? "Mannschaft bearbeiten" : "Neue Mannschaft";
  document.getElementById("tf-name").value = t ? t.name : "";
  document.getElementById("tf-liga").value = t ? t.liga : "";
  document.getElementById("tf-trainer").value = t ? t.trainer : "";
  document.getElementById("tf-optionen").innerHTML = season.busOptions.length
    ? season.busOptions.map((o) => `
      <label class="checkbox-row"><input type="checkbox" value="${escapeHtml(o.id)}" ${t && t.busOptionIds.includes(o.id) ? "checked" : ""} /> ${escapeHtml(o.name)}</label>`).join("")
    : `<p class="muted">Noch keine Bus-Optionen angelegt — zuerst im Tab „Bus-Regeln" anlegen.</p>`;
  document.getElementById("btn-delete-team").classList.toggle("hidden", !t);
  document.getElementById("team-modal").classList.remove("hidden");
  document.getElementById("tf-name").focus();
}
function closeTeamModal() {
  document.getElementById("team-modal").classList.add("hidden");
  editingTeamId = null;
}
function saveTeam() {
  const name = val("tf-name").trim();
  if (!name) { alert("Bitte einen Namen eingeben."); return; }
  const season = getSeason();
  let t = editingTeamId ? season.teams.find((x) => x.id === editingTeamId) : null;
  const busOptionIds = Array.from(document.querySelectorAll("#tf-optionen input:checked")).map((el) => el.value);
  if (!t) { t = { id: uuid(), spiele: [] }; season.teams.push(t); }
  t.name = name;
  t.liga = val("tf-liga").trim();
  t.trainer = val("tf-trainer").trim();
  t.busOptionIds = busOptionIds;
  t.spiele.forEach((sp) => {
    const status = {};
    busOptionIds.forEach((oid) => { status[oid] = sp.status[oid] || { wert: "", notiz: "" }; });
    sp.status = status;
  });
  if (!currentTeamId) currentTeamId = t.id;
  persist();
  renderAll();
  closeTeamModal();
}
function deleteTeam() {
  if (!editingTeamId) return;
  if (!confirm("Diese Mannschaft mit allen Spielen wirklich löschen?")) return;
  const season = getSeason();
  season.teams = season.teams.filter((x) => x.id !== editingTeamId);
  if (currentTeamId === editingTeamId) currentTeamId = null;
  persist();
  renderAll();
  closeTeamModal();
}

// ---------- Spiel-Formular ----------
function openSpielModal(teamId, id) {
  if (!canEdit()) return;
  const team = getSeason().teams.find((t) => t.id === teamId);
  if (!team) return;
  const sp = id ? team.spiele.find((x) => x.id === id) : null;
  editingSpiel = { teamId, id: sp ? sp.id : null };
  document.getElementById("spiel-modal-title").textContent = sp ? "Spiel bearbeiten" : "Neues Spiel";
  document.getElementById("sf-datum").value = sp ? sp.datum : "";
  document.getElementById("sf-ort").value = sp ? sp.ort : "";
  document.getElementById("sf-notiz").value = sp ? sp.notiz : "";
  document.getElementById("btn-delete-spiel").classList.toggle("hidden", !sp);
  document.getElementById("spiel-modal").classList.remove("hidden");
  document.getElementById("sf-datum").focus();
}
function closeSpielModal() {
  document.getElementById("spiel-modal").classList.add("hidden");
  editingSpiel = { teamId: null, id: null };
}
function saveSpiel() {
  const team = getSeason().teams.find((t) => t.id === editingSpiel.teamId);
  if (!team) return;
  const datum = val("sf-datum");
  const ort = val("sf-ort").trim();
  if (!datum || !ort) { alert("Bitte Datum und Ort angeben."); return; }
  let sp = editingSpiel.id ? team.spiele.find((x) => x.id === editingSpiel.id) : null;
  if (!sp) {
    sp = { id: uuid(), status: {} };
    team.busOptionIds.forEach((oid) => { sp.status[oid] = { wert: "", notiz: "" }; });
    team.spiele.push(sp);
  }
  sp.datum = datum;
  sp.ort = ort;
  sp.notiz = val("sf-notiz").trim();
  persist();
  renderAll();
  closeSpielModal();
}
function deleteSpiel() {
  const team = getSeason().teams.find((t) => t.id === editingSpiel.teamId);
  if (!team || !editingSpiel.id) return;
  if (!confirm("Dieses Spiel wirklich löschen?")) return;
  team.spiele = team.spiele.filter((x) => x.id !== editingSpiel.id);
  persist();
  renderAll();
  closeSpielModal();
}

// ---------- Status-Formular ----------
function openStatusModal(spielId, optionId) {
  if (!canEdit()) return;
  const team = currentTeam();
  if (!team) return;
  const sp = team.spiele.find((x) => x.id === spielId);
  if (!sp) return;
  const option = getSeason().busOptions.find((o) => o.id === optionId);
  editingStatus = { teamId: team.id, spielId, optionId };
  document.getElementById("status-modal-context").textContent =
    `${team.name} — ${fmtDatum(sp.datum)}, ${sp.ort} — ${option ? option.name : ""}`;
  const st = sp.status[optionId] || { wert: "", notiz: "" };
  document.getElementById("sm-wert").innerHTML = STATUS_WERTE.map((s) =>
    `<option value="${escapeHtml(s.id)}" ${s.id === st.wert ? "selected" : ""}>${escapeHtml(s.label)}</option>`).join("");
  document.getElementById("sm-notiz").value = st.notiz || "";
  document.getElementById("status-modal").classList.remove("hidden");
}
function closeStatusModal() {
  document.getElementById("status-modal").classList.add("hidden");
  editingStatus = { teamId: null, spielId: null, optionId: null };
}
function saveStatus() {
  const { teamId, spielId, optionId } = editingStatus;
  const team = getSeason().teams.find((t) => t.id === teamId);
  const sp = team && team.spiele.find((x) => x.id === spielId);
  if (!sp) return;
  const wert = val("sm-wert");
  if (CONFLICT_STATUS_IDS.includes(wert) && sp.datum) {
    const others = getSeason().teams.flatMap((t) => t.spiele
      .filter((x) => x.datum === sp.datum && !(t.id === teamId && x.id === spielId) && t.busOptionIds.includes(optionId))
      .filter((x) => CONFLICT_STATUS_IDS.includes((x.status[optionId] || {}).wert))
      .map((x) => ({ teamName: t.name, ort: x.ort })));
    if (others.length) {
      const option = getSeason().busOptions.find((o) => o.id === optionId);
      const list = others.map((o) => `${o.teamName} (${o.ort || "Ort offen"})`).join(", ");
      const proceed = confirm(`Achtung: ${list} nutzt „${option ? option.name : optionId}" ebenfalls am ${fmtDatum(sp.datum)}. Trotzdem speichern?`);
      if (!proceed) return;
    }
  }
  sp.status[optionId] = { wert, notiz: val("sm-notiz").trim() };
  persist();
  renderBusplanGrid();
  renderSummary();
  renderKonflikte();
  closeStatusModal();
}

// ---------- Liste-Tab ----------
function allSpieleFlat() {
  const season = getSeason();
  const rows = [];
  season.teams.forEach((t) => t.spiele.forEach((sp) => {
    const kritisch = t.busOptionIds.filter((oid) => ["offen", "klaerung"].includes((sp.status[oid] || {}).wert)).length;
    rows.push({ teamId: t.id, teamName: t.name, spielId: sp.id, datum: sp.datum, ort: sp.ort, kritisch });
  }));
  rows.sort((a, b) => (a.datum || "").localeCompare(b.datum || ""));
  return rows;
}
function fillListeTeamFilter() {
  const el = document.getElementById("liste-team");
  const cur = el.value;
  const teams = getSeason().teams;
  el.innerHTML = `<option value="">Alle Mannschaften</option>` +
    teams.map((t) => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`).join("");
  if (teams.some((t) => t.id === cur)) el.value = cur;
}
function renderListe() {
  const q = val("liste-search").trim().toLowerCase();
  const tf = val("liste-team");
  const all = allSpieleFlat();
  const rows = all.filter((r) => {
    if (tf && r.teamId !== tf) return false;
    if (q && !`${r.teamName} ${r.ort}`.toLowerCase().includes(q)) return false;
    return true;
  });
  document.getElementById("liste-rows").innerHTML = rows.map((r) => `
    <div class="list-row" data-team="${escapeHtml(r.teamId)}">
      <span class="lr-strong">${escapeHtml(fmtDatum(r.datum))}</span>
      <span>${escapeHtml(r.teamName)}</span>
      <span>${escapeHtml(r.ort)}</span>
      <span>${r.kritisch ? `<span class="badge">${r.kritisch} offen</span>` : "—"}</span>
    </div>`).join("");
  document.getElementById("liste-count").textContent = `${rows.length} von ${all.length}`;
  document.getElementById("liste-empty").classList.toggle("hidden", rows.length > 0);
}

// ---------- PDF-Export (Gesamtübersicht) ----------
function exportBusplanPdf() {
  const season = getSeason();
  const counts = statusCounts();
  const totalSpiele = season.teams.reduce((a, t) => a + t.spiele.length, 0);
  const kennzahlen = [
    { label: "Mannschaften", value: season.teams.length },
    { label: "Spiele gesamt", value: totalSpiele },
    { label: "Zusagen", value: counts.zusage || 0 },
    { label: "Offen / in Klärung", value: (counts.offen || 0) + (counts.klaerung || 0) },
    { label: "Absagen", value: counts.absage || 0 }
  ];
  const kennzahlenHtml = kennzahlen.map((k) => `
    <div class="print-kennzahl"><div class="pk-label">${escapeHtml(k.label)}</div><div class="pk-value">${escapeHtml(String(k.value))}</div></div>`).join("");

  const conflictGroups = findConflictGroups().sort((a, b) => a.datum.localeCompare(b.datum));
  const conflictMap = conflictMapFromGroups(conflictGroups);
  const conflictHtml = conflictGroups.length ? `
    <div class="print-konflikte">
      <h2>⚠️ Konflikte</h2>
      ${conflictGroups.map((g) => {
        const option = season.busOptions.find((o) => o.id === g.optionId);
        const teamsText = g.entries.map((e) => `${escapeHtml(e.teamName)} (${escapeHtml(e.ort || "Ort offen")})`).join(" + ");
        return `<div class="print-konflikt-row"><strong>${escapeHtml(fmtDatum(g.datum))}</strong> — ${escapeHtml(option ? option.name : g.optionId)}: ${teamsText}</div>`;
      }).join("")}
    </div>` : "";

  const teamBlocksHtml = season.teams.map((t) => {
    const options = t.busOptionIds.map((id) => season.busOptions.find((o) => o.id === id)).filter(Boolean);
    const spiele = t.spiele.slice().sort((a, b) => (a.datum || "").localeCompare(b.datum || ""));
    const heading = `<h2>${escapeHtml(t.name)}${t.liga ? " — " + escapeHtml(t.liga) : ""}</h2>`;
    if (!spiele.length) {
      return `<div class="print-team-block">${heading}<p class="print-meta">Keine Spiele erfasst.</p></div>`;
    }
    const theadHtml = `<tr><th>Datum</th><th>Ort</th>${options.map((o) => `<th>${escapeHtml(o.name)}</th>`).join("")}<th>Notiz</th></tr>`;
    const rowsHtml = spiele.map((sp) => {
      const cells = options.map((o) => {
        const st = sp.status[o.id] || { wert: "", notiz: "" };
        const def = STATUS_WERTE.find((s) => s.id === st.wert) || STATUS_WERTE[0];
        const partners = conflictMap[`${t.id}|${sp.id}|${o.id}`];
        let text = def.label;
        if (st.notiz) text += " – " + st.notiz;
        if (partners) text += " ⚠️";
        return `<td class="print-status-cell" style="background:${def.farbe}">${escapeHtml(text)}</td>`;
      }).join("");
      return `<tr>
        <td class="strong">${escapeHtml(fmtDatum(sp.datum))}</td>
        <td>${escapeHtml(sp.ort)}</td>
        ${cells}
        <td>${escapeHtml(sp.notiz || "")}</td>
      </tr>`;
    }).join("");
    return `<div class="print-team-block">${heading}<table class="print-table"><thead>${theadHtml}</thead><tbody>${rowsHtml}</tbody></table></div>`;
  }).join("");

  document.getElementById("print-content").innerHTML = `
    <h1>🚌 Busplan — Gesamtübersicht</h1>
    <p class="print-meta">Saison ${escapeHtml(currentSeasonKey())} — erstellt am ${new Date().toLocaleString("de-DE")}</p>
    <div class="print-kennzahlen">${kennzahlenHtml}</div>
    ${conflictHtml}
    ${teamBlocksHtml || `<p class="print-meta">Für diese Saison sind noch keine Mannschaften erfasst.</p>`}`;
  document.body.classList.add("printing-report");
  const cleanup = () => { document.body.classList.remove("printing-report"); window.removeEventListener("afterprint", cleanup); };
  window.addEventListener("afterprint", cleanup);
  setTimeout(() => window.print(), 150);
}

// ---------- Bus-Optionen-Editor ----------
function cleanupSeasonReferences() {
  appData.seasons[currentSeasonKey()] = normalizeSeason(getSeason());
}
// Regeln-Feld immer so hoch wie sein Inhalt — box-sizing ist border-box, scrollHeight
// enthaelt die Rahmen aber nicht, daher die Differenz offsetHeight-clientHeight addieren.
function autoGrowRegeln(el) {
  if (!el || !el.offsetParent) return; // im ausgeblendeten Tab liefert scrollHeight keine brauchbare Hoehe
  el.style.height = "auto";
  el.style.height = (el.scrollHeight + el.offsetHeight - el.clientHeight) + "px";
}
function renderBusOptionen() {
  const season = getSeason();
  const editable = canEdit();
  document.getElementById("busoptionen-list").innerHTML = season.busOptions.map((o, i) => `
    <div class="busoption-row">
      <div class="param-row">
        <input class="pg-label" data-idx="${i}" value="${escapeHtml(o.name)}" ${editable ? "" : "disabled"} />
        ${editable ? `<button class="icon-btn" data-remove-option="${i}" title="Entfernen">×</button>` : ""}
      </div>
      <textarea class="pg-regeln" data-regeln-idx="${i}" rows="2" placeholder="Regeln für diesen Bus, z. B. Buchungsfrist, max. Personenzahl, Abfahrtsort …" ${editable ? "" : "disabled"}>${escapeHtml(o.regeln)}</textarea>
      <label class="bo-abfragbar"><input type="checkbox" class="pg-abfragbar" data-abfragbar-idx="${i}" ${o.abfragbar !== false ? "checked" : ""} ${editable ? "" : "disabled"} /> In der Busabfrage führen — der Bus wird für einen Tag als frei oder vergeben angezeigt und kann angefragt werden.</label>
    </div>`).join("") || `<p class="muted">Noch keine Bus-Optionen angelegt.</p>`;
  document.querySelectorAll("#busoptionen-list .pg-regeln").forEach(autoGrowRegeln);
}

// ---------- Busabfrage: ist an dem Tag noch ein Bus frei? ----------
//
// Michel-Wunsch (2026-08-19): ein Datum eingeben und sehen, welche Busse an dem
// Tag noch frei sind — dazu ein Weg, einen davon für den Tag anzufragen.
//
// ⚠️ Die Belegung wird NICHT eigens gespeichert, sondern aus den Spielen der
// laufenden Saison abgeleitet. Ein zweiter, gepflegter Belegungsstand liefe
// unweigerlich neben dem Busplan her — und der Busplan ist die Wahrheit.
// Gerechnet wird mit derselben Statusliste wie die Konflikt-Prüfung
// (CONFLICT_STATUS_IDS): „Absage" und ein leeres Feld belegen nichts.
//
// ⚠️ Die Anfragen liegen in einer eigenen Nextcloud-Datei und laufen über eigene
// Worker-Aktionen (siehe db.js). Sie stehen deshalb NICHT in `appData` und
// werden nie über persist() geschrieben.

// [] = es gibt keine, null = gerade nicht abrufbar (alter Worker, Netzfehler).
// Der Unterschied ist sichtbar: leere Liste sagt „keine Anfragen", null sagt
// „nicht abrufbar" — sonst sieht ein Fehler wie ein leerer Posteingang aus.
let busAnfragen = null;
let abfrageDatum = "";
let anfrageEntwurf = null;     // { datum, busOptionId, busName }
let entscheidAnfrageId = null;

function istBusAbfragbar(o) {
  // Fehlendes Feld gilt als abfragbar: bestehende Bus-Optionen sollen nach dem
  // Update nicht plötzlich alle aus der Abfrage fallen. Wer einen Eintrag nicht
  // geführt haben will, nimmt das Häkchen weg. Gleiche Vorgabe im Worker.
  return !!o && o.abfragbar !== false;
}
function abfragbareOptionen() {
  return getSeason().busOptions.filter(istBusAbfragbar);
}

// Datum in der Zeitzone des Geräts, nicht per toISOString (das ist UTC und
// liefert abends den falschen Tag).
function isoTag(plusTage) {
  const d = new Date();
  if (plusTage) d.setDate(d.getDate() + plusTage);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function anfragenListe() { return Array.isArray(busAnfragen) ? busAnfragen : []; }

// Welche Anfragen betreffen genau diesen Bus an genau diesem Tag?
function anfragenFuer(datum, optionId, status) {
  return anfragenListe().filter((a) => a.datum === datum && a.busOptionId === optionId
    && (!status || a.status === status));
}

// Kern der Abfrage. Liefert je abfragbarer Bus-Option, ob sie an dem Tag frei
// ist, und wer sie sonst hat.
//
// ⚠️ Eine ZUGESAGTE Anfrage belegt mit. Sonst zeigte die Abfrage einen Bus als
// frei, den die Geschäftsstelle eine Stunde vorher vergeben hat — und die
// nächste Anfrage ginge auf denselben Tag.
function busVerfuegbarkeit(datum) {
  const season = getSeason();
  return abfragbareOptionen().map((o) => {
    const belegt = [];
    season.teams.forEach((t) => {
      if (!t.busOptionIds.includes(o.id)) return;
      t.spiele.forEach((sp) => {
        if (sp.datum !== datum) return;
        const st = sp.status[o.id] || {};
        if (!CONFLICT_STATUS_IDS.includes(st.wert)) return;
        const w = STATUS_WERTE.find((x) => x.id === st.wert);
        belegt.push({
          quelle: "spiel", teamId: t.id, teamName: t.name,
          ort: sp.ort, wertLabel: w ? w.label : st.wert, notiz: st.notiz || ""
        });
      });
    });
    anfragenFuer(datum, o.id, "zugesagt").forEach((a) => {
      belegt.push({
        quelle: "anfrage", teamId: null, teamName: a.teamName,
        ort: "", wertLabel: "zugesagte Anfrage", notiz: a.zweck || ""
      });
    });
    return { option: o, belegt, offen: anfragenFuer(datum, o.id, "offen") };
  });
}

function renderBusabfrage() {
  const feld = document.getElementById("ba-datum");
  if (!feld) return;
  if (feld.value !== abfrageDatum) feld.value = abfrageDatum;

  const ziel = document.getElementById("ba-ergebnis");
  if (!abfrageDatum) {
    ziel.innerHTML = `<p class="muted">Trag oben einen Tag ein — dann steht hier, welcher Bus an dem Tag noch frei ist.</p>`;
    return;
  }
  const optionen = abfragbareOptionen();
  if (!optionen.length) {
    ziel.innerHTML = `<p class="muted">Für diese Saison ist kein Bus zur Abfrage freigegeben. Das Häkchen „In der Busabfrage führen“ setzt du im Reiter „Bus-Regeln“.</p>`;
    return;
  }

  const zeilen = busVerfuegbarkeit(abfrageDatum).map((e) => {
    const frei = e.belegt.length === 0;
    const grund = frei
      ? `<span class="ba-frei-text">frei</span>`
      : e.belegt.map((b) => `<span class="ba-belegt-text">${escapeHtml(b.teamName || "ohne Mannschaft")}
          — ${escapeHtml(b.wertLabel)}${b.ort ? " · " + escapeHtml(b.ort) : ""}${b.notiz ? " · " + escapeHtml(b.notiz) : ""}</span>`).join("");
    const offenHinweis = e.offen.length
      ? `<div class="ba-offen">⏳ ${e.offen.length === 1 ? "Eine Anfrage" : e.offen.length + " Anfragen"} zu diesem Bus ${e.offen.length === 1 ? "ist" : "sind"} noch offen.</div>`
      : "";
    const regeln = e.option.regeln
      ? `<div class="ba-regeln">ℹ️ ${escapeHtml(e.option.regeln)}</div>`
      : "";
    // Anfragen darf jeder, der den Busplan sieht — deshalb bewusst KEIN
    // editor-only am Knopf (siehe die schmale Worker-Aktion in db.js).
    const knopf = frei
      ? `<button type="button" class="btn small" data-anfragen="${escapeHtml(e.option.id)}">Anfragen</button>`
      : "";
    return `<div class="ba-zeile ${frei ? "ist-frei" : "ist-belegt"}">
      <div class="ba-kopf">
        <span class="ba-icon">${frei ? "✅" : "⛔"}</span>
        <span class="ba-name">${escapeHtml(e.option.name)}</span>
        ${knopf}
      </div>
      <div class="ba-grund">${grund}</div>
      ${offenHinweis}
      ${regeln}
    </div>`;
  }).join("");

  ziel.innerHTML = `<div class="ba-tag">${escapeHtml(fmtDatum(abfrageDatum))}</div>${zeilen}`;
}

function anfrageStatusText(status) {
  if (status === "zugesagt") return "✅ zugesagt";
  if (status === "abgelehnt") return "⛔ abgelehnt";
  return "⏳ offen";
}

function renderAnfragen() {
  const ziel = document.getElementById("ba-anfragen");
  if (!ziel) return;
  if (busAnfragen === null) {
    ziel.innerHTML = `<p class="muted">Die Anfragen sind gerade nicht abrufbar.</p>`;
    return;
  }
  if (!busAnfragen.length) {
    ziel.innerHTML = `<p class="muted">Es liegt keine Anfrage vor.</p>`;
    return;
  }
  const season = getSeason();
  const eigener = currentUser ? currentUser.username : "";
  const darfEntscheiden = canEdit();
  // Offene zuerst, danach nach Fahrtag — die offenen sind das, was jemand tun muss.
  const sortiert = busAnfragen.slice().sort((a, b) => {
    if ((a.status === "offen") !== (b.status === "offen")) return a.status === "offen" ? -1 : 1;
    return String(a.datum).localeCompare(String(b.datum));
  });
  ziel.innerHTML = sortiert.map((a) => {
    // Der aktuelle Name der Bus-Option gewinnt; der mitgespeicherte busName ist
    // der Rückfall für eine inzwischen gelöschte Option.
    const opt = season.busOptions.find((o) => o.id === a.busOptionId);
    const busName = opt ? opt.name : (a.busName || a.busOptionId);
    const antwort = a.antwort
      ? `<div class="ar-antwort">Antwort: ${escapeHtml(a.antwort)}${a.entschiedenVon ? " (" + escapeHtml(a.entschiedenVon) + ")" : ""}</div>`
      : "";
    const knoepfe = [];
    if (darfEntscheiden) {
      knoepfe.push(`<button type="button" class="btn small secondary" data-entscheiden="${escapeHtml(a.id)}">Entscheiden…</button>`);
      knoepfe.push(`<button type="button" class="btn small danger" data-anfrage-loeschen="${escapeHtml(a.id)}">Entfernen</button>`);
    } else if (a.status === "offen" && a.ersteller && a.ersteller === eigener) {
      // Die eigene noch offene Anfrage darf jeder zurücknehmen — eine bereits
      // entschiedene nicht, sonst ließe sich eine Absage verschwinden lassen.
      knoepfe.push(`<button type="button" class="btn small secondary" data-anfrage-loeschen="${escapeHtml(a.id)}">Zurücknehmen</button>`);
    }
    return `<div class="anfrage-row st-${escapeHtml(a.status)}">
      <div class="ar-kopf">
        <span class="ar-status">${anfrageStatusText(a.status)}</span>
        <strong>${escapeHtml(fmtDatum(a.datum))}</strong>
        <span class="ar-bus">${escapeHtml(busName)}</span>
      </div>
      <div class="ar-body">${escapeHtml(a.teamName)}${a.zweck ? " — " + escapeHtml(a.zweck) : ""}</div>
      <div class="ar-meta">angefragt von ${escapeHtml(a.erstellerName || a.ersteller || "unbekannt")}</div>
      ${antwort}
      ${knoepfe.length ? `<div class="btn-row" style="justify-content:flex-start;">${knoepfe.join("")}</div>` : ""}
    </div>`;
  }).join("");
}

// Karte in der Übersicht. ⚠️ Ohne sie fällt eine offene Anfrage niemandem auf —
// es gibt bewusst weder Mail noch Push dafür.
function renderAnfragenKarte() {
  const karte = document.getElementById("anfragen-card");
  const liste = document.getElementById("anfragen-card-list");
  if (!karte || !liste) return;
  const offen = anfragenListe().filter((a) => a.status === "offen");
  karte.classList.toggle("hidden", offen.length === 0);
  if (!offen.length) return;
  const season = getSeason();
  liste.innerHTML = offen
    .slice().sort((a, b) => String(a.datum).localeCompare(String(b.datum)))
    .map((a) => {
      const opt = season.busOptions.find((o) => o.id === a.busOptionId);
      return `<div class="konflikt-row">
        <span class="lr-strong">${escapeHtml(fmtDatum(a.datum))}</span>
        <span>${escapeHtml(opt ? opt.name : (a.busName || a.busOptionId))}</span>
        <span>${escapeHtml(a.teamName)}</span>
      </div>`;
    }).join("");
}

function setAbfrageStatus(text, kind) {
  const el = document.getElementById("ba-status");
  if (!el) return;
  el.textContent = text || "";
  el.className = "ba-status" + (kind ? " is-" + kind : "");
}

// ---------- Anfrage stellen ----------
function openAnfrageModal(optionId) {
  const opt = getSeason().busOptions.find((o) => o.id === optionId);
  if (!opt || !abfrageDatum) return;
  anfrageEntwurf = { datum: abfrageDatum, busOptionId: opt.id, busName: opt.name };
  document.getElementById("anfrage-modal-context").innerHTML =
    `<strong>${escapeHtml(opt.name)}</strong> am ${escapeHtml(fmtDatum(abfrageDatum))}`
    + (opt.regeln ? `<br />ℹ️ ${escapeHtml(opt.regeln)}` : "");
  document.getElementById("af-team").value = "";
  document.getElementById("af-zweck").value = "";
  // Vorschläge: die Mannschaften dieser Saison. Bewusst eine datalist und kein
  // select — eine Anfrage kann auch für eine Sonderfahrt gestellt werden.
  document.getElementById("anfrage-mannschaften").innerHTML = getSeason().teams
    .map((t) => `<option value="${escapeHtml(t.name)}"></option>`).join("");
  document.getElementById("anfrage-modal").classList.remove("hidden");
  document.getElementById("af-team").focus();
}
function closeAnfrageModal() {
  anfrageEntwurf = null;
  document.getElementById("anfrage-modal").classList.add("hidden");
}

async function saveAnfrage() {
  if (!anfrageEntwurf) return;
  const teamName = val("af-team").trim();
  const zweck = val("af-zweck").trim();
  if (!teamName) { alert("Bitte die Mannschaft oder den Anlass angeben."); return; }
  const knopf = document.getElementById("btn-save-anfrage");
  knopf.disabled = true;
  try {
    const antwort = await sendeBusAnfrage({
      saison: currentSeasonKey(),
      datum: anfrageEntwurf.datum,
      busOptionId: anfrageEntwurf.busOptionId,
      teamName, zweck
    });
    busAnfragen = Array.isArray(antwort.anfragen) ? antwort.anfragen : busAnfragen;
    closeAnfrageModal();
    renderBusabfrage();
    renderAnfragen();
    renderAnfragenKarte();
    setAbfrageStatus(antwort.doppelt
      ? "Diese Anfrage lag schon vor."
      : "Anfrage ist eingegangen.", "ok");
  } catch (e) {
    // ⚠️ Nicht still verschlucken: wer eine Anfrage abschickt, verlässt sich
    // darauf, dass sie angekommen ist.
    alert("Die Anfrage konnte nicht gespeichert werden: " + e.message);
  } finally {
    knopf.disabled = false;
  }
}

// ---------- Anfrage entscheiden (Bearbeiter) ----------
function openEntscheidModal(id) {
  const a = anfragenListe().find((x) => x.id === id);
  if (!a || !canEdit()) return;
  entscheidAnfrageId = id;
  const opt = getSeason().busOptions.find((o) => o.id === a.busOptionId);
  document.getElementById("entscheid-modal-context").innerHTML =
    `<strong>${escapeHtml(opt ? opt.name : (a.busName || a.busOptionId))}</strong>
     am ${escapeHtml(fmtDatum(a.datum))} — ${escapeHtml(a.teamName)}`;
  document.getElementById("ef-status").value = a.status;
  document.getElementById("ef-antwort").value = a.antwort || "";
  document.getElementById("entscheid-modal").classList.remove("hidden");
}
function closeEntscheidModal() {
  entscheidAnfrageId = null;
  document.getElementById("entscheid-modal").classList.add("hidden");
}

async function saveEntscheidung() {
  if (!entscheidAnfrageId) return;
  const knopf = document.getElementById("btn-save-entscheid");
  knopf.disabled = true;
  try {
    const antwort = await entscheideBusAnfrage(entscheidAnfrageId, val("ef-status"), val("ef-antwort").trim());
    busAnfragen = Array.isArray(antwort.anfragen) ? antwort.anfragen : busAnfragen;
    closeEntscheidModal();
    renderBusabfrage();
    renderAnfragen();
    renderAnfragenKarte();
    setAbfrageStatus("Entscheidung gespeichert.", "ok");
  } catch (e) {
    alert("Die Entscheidung konnte nicht gespeichert werden: " + e.message);
  } finally {
    knopf.disabled = false;
  }
}

async function anfrageEntfernen(id) {
  const a = anfragenListe().find((x) => x.id === id);
  if (!a) return;
  if (!confirm("Diese Anfrage wirklich entfernen?")) return;
  try {
    const antwort = await loescheBusAnfrage(id);
    busAnfragen = Array.isArray(antwort.anfragen) ? antwort.anfragen : busAnfragen;
    renderBusabfrage();
    renderAnfragen();
    renderAnfragenKarte();
    setAbfrageStatus("Anfrage entfernt.", "ok");
  } catch (e) {
    alert("Die Anfrage konnte nicht entfernt werden: " + e.message);
  }
}

async function ladeBusAnfragen() {
  busAnfragen = await fetchBusAnfragen();
  renderAnfragen();
  renderAnfragenKarte();
  renderBusabfrage();
}

// ---------- Saison-Verwaltung ----------
function renderSeasonSelect() {
  const el = document.getElementById("season-select");
  const keys = Object.keys(appData.seasons).sort();
  el.innerHTML = keys.map((k) => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join("");
  el.value = currentSeasonKey();
  const info = document.getElementById("season-info");
  if (info) info.textContent = `${currentSeasonKey()} — ${getSeason().teams.length} Mannschaften`;
}
function switchSeason(key) {
  if (!appData.seasons[key]) return;
  appData.meta.currentSeason = key;
  currentTeamId = null;
  persist();
  renderAll();
}
function newSeason() {
  if (!canAdmin()) return;
  const name = (prompt("Name der neuen Saison, z. B. Herbst-2026:") || "").trim();
  if (!name) return;
  if (appData.seasons[name]) { alert("Diese Saison existiert bereits."); return; }
  appData.seasons[name] = seedSeason();
  switchSeason(name);
}
function duplicateSeason() {
  if (!canAdmin()) return;
  const name = (prompt("Name der neuen Saison (Mannschaften/Bus-Optionen werden übernommen, Spiele NICHT), z. B. Herbst-2026:") || "").trim();
  if (!name) return;
  if (appData.seasons[name]) { alert("Diese Saison existiert bereits."); return; }
  const cur = getSeason();
  appData.seasons[name] = {
    busOptions: clone(cur.busOptions),
    teams: clone(cur.teams).map((t) => ({ ...t, spiele: [] }))
  };
  switchSeason(name);
}
function deleteSeason() {
  if (!canAdmin()) return;
  if (Object.keys(appData.seasons).length <= 1) { alert("Die letzte Saison kann nicht gelöscht werden."); return; }
  const key = currentSeasonKey();
  if (!confirm(`Saison „${key}“ mit allen Mannschaften und Spielen wirklich löschen?`)) return;
  delete appData.seasons[key];
  appData.meta.currentSeason = Object.keys(appData.seasons)[0];
  currentTeamId = null;
  persist();
  renderAll();
}

// ---------- Import (einmaliger Cloud-Seed) ----------
function handleImportFile(file) {
  if (!file) return;
  if (!canAdmin()) { alert("Importieren ist Administrierenden vorbehalten."); return; }
  const reader = new FileReader();
  reader.onload = async () => {
    let parsed;
    try { parsed = JSON.parse(reader.result); }
    catch (e) { alert("Die Datei ist kein gültiges JSON."); return; }
    if (!parsed || !Array.isArray(parsed.teams)) {
      alert("Die Datei enthält nicht das erwartete Format ({ busOptions: [...], teams: [...] }).");
      return;
    }
    const season = getSeason();
    if (season.teams.length > 0 && !confirm("Es sind bereits Mannschaften vorhanden. Diese durch den Import ERSETZEN?")) return;
    appData.seasons[currentSeasonKey()] = normalizeSeason(parsed);
    currentTeamId = null;
    renderAll();
    const ok = await saveNow();
    if (ok) alert("Import erfolgreich gespeichert.");
  };
  reader.readAsText(file, "utf-8");
}

// ---------- Meta / Changelog / Nutzer ----------
function renderMeta() {
  const m = appData.meta || {};
  const rows = [
    ["Aktive Saison", currentSeasonKey()],
    ["Saisons gesamt", String(Object.keys(appData.seasons).length)],
    ["Letzter Stand", m.stand ? new Date(m.stand).toLocaleString("de-DE") : "—"]
  ];
  document.getElementById("meta-view").innerHTML = rows.map(([k, v]) =>
    `<div class="form-field"><label>${escapeHtml(k)}</label><span>${escapeHtml(v)}</span></div>`).join("");
}
function renderVersionInfo() {
  document.querySelectorAll("#version-badge, #version-badge-2").forEach((el) => { if (el) el.textContent = "v" + APP_VERSION; });
  const list = document.getElementById("changelog-list");
  if (!list) return;
  list.innerHTML = APP_CHANGELOG.map((entry) => `
    <div class="changelog-entry">
      <div class="cv">Version ${escapeHtml(entry.version)}</div>
      ${entry.groups.map((g) => `
        <div class="changelog-group">
          <div class="cg-title">${escapeHtml(g.title)}</div>
          <ul class="cg-items">${g.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
        </div>`).join("")}
    </div>`).join("");
}
function renderHeaderUser() {
  const el = document.getElementById("header-user");
  const el2 = document.getElementById("einstellungen-user");
  if (!currentUser) { if (el) el.textContent = ""; if (el2) el2.textContent = ""; return; }
  const name = (currentUser.vorname || currentUser.nachname)
    ? `${currentUser.vorname || ""} ${currentUser.nachname || ""}`.trim()
    : currentUser.username;
  const rolle = currentUser.isAdmin ? " (Admin)" : (canEdit() ? " (Bearbeiter)" : "");
  if (el) el.textContent = "👤 " + name + rolle;
  if (el2) el2.textContent = "Angemeldet als " + name + rolle +
    (canEdit() ? "" : " — Bearbeiten ist bestimmten Nutzern vorbehalten.");
}
// Dritte Stufe "Administrieren" (Tools-Übersicht, seit 2026-07-24):
// Saison-Verwaltung und Daten-Import sind strukturelle Eingriffe und hängen an
// dieser Stufe, nicht mehr am Bearbeiten-Recht. canAdmin kommt wie canEdit aus
// me (Administrieren schließt Bearbeiten serverseitig ein — umgekehrt nicht).
function canAdmin() {
  if (!currentUser) return false;
  return currentUser.isAdmin || !!currentUser.canAdmin;
}

function applyEditVisibility() {
  const editable = canEdit();
  const admin = canAdmin();
  document.body.classList.toggle("can-edit", editable);
  document.querySelectorAll(".editor-only").forEach((el) => el.classList.toggle("hidden", !editable));
  document.querySelectorAll(".admin-only").forEach((el) => el.classList.toggle("hidden", !admin));
}

function renderAll() {
  renderSeasonSelect();
  renderSummary();
  renderKonflikte();
  renderTeamSwitch();
  renderBusplanGrid();
  fillListeTeamFilter();
  renderListe();
  renderBusOptionen();
  renderBusabfrage();
  renderAnfragen();
  renderAnfragenKarte();
  renderMeta();
  renderVersionInfo();
  applyEditVisibility();
}

// ---------- Tabs ----------
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-section").forEach((s) => s.classList.toggle("active", s.id === "tab-" + tab));
  if (tab === "uebersicht") { renderSummary(); renderKonflikte(); renderAnfragenKarte(); }
  if (tab === "busplan") { renderTeamSwitch(); renderBusplanGrid(); }
  if (tab === "liste") { fillListeTeamFilter(); renderListe(); }
  if (tab === "busregeln") { renderBusOptionen(); }
  if (tab === "busabfrage") { renderBusabfrage(); renderAnfragen(); }
  if (tab === "einstellungen") { renderSeasonSelect(); }
  if (tab === "info") { renderMeta(); renderVersionInfo(); }
}

// ---------- Gateway: Laden / Speichern / Konflikte ----------
function setSaveStatus(text, kind) {
  const el = document.getElementById("save-status");
  if (!el) return;
  el.textContent = text;
  el.className = "header-status" + (kind ? " is-" + kind : "");
}
function persist() {
  clearTimeout(persistTimer);
  setSaveStatus("Änderung noch nicht gespeichert…", "pending");
  ungespeicherteAenderungen = true;
  persistTimer = setTimeout(doPersist, 300);
}
async function saveNow() { clearTimeout(persistTimer); return doPersist(); }

// Es darf immer nur EIN dav-save unterwegs sein. gatewayRev (das ETag, mit dem der
// Worker Konflikte erkennt) wird erst aktualisiert, wenn ein Save zurückkommt —
// ein zweiter Save, der währenddessen startet, schickt also dasselbe, inzwischen
// veraltete ETag und wird zwangsläufig mit 409 abgelehnt. Für die bearbeitende
// Person sah das aus wie "ein anderes Gerät hat geändert", obwohl sie allein war,
// und reloadAfterConflict() verwarf dabei ihre letzte Eingabe. Beim Tippen in die
// Bus-Regeln (persist() bei jedem Tastendruck, 300-ms-Debounce, WebDAV-Runde
// deutlich länger) passierte das mehrmals pro Satz.
// Deshalb: Änderungen, die während eines laufenden Saves anfallen, nur vormerken
// und danach in einem Rutsch nachschreiben. appData wird ohnehin immer komplett
// geschrieben, es geht also nichts verloren, wenn mehrere Änderungen zusammenfallen.
let saveRunner = null;
let saveDirty = false;
// Fuer das Sicherheitsnetz beim Verlassen der Seite (beforeunload unter
// runSaveLoop): "es liegt etwas an" und "der letzte Versuch ging schief".
// Beides wird eigens gepflegt statt aus saveDirty/saveRunner abgeleitet -- der
// Debounce-Timer laeuft schon, bevor saveDirty ueberhaupt gesetzt ist, und
// genau dieses Fenster ist der Fall, den das Netz auffangen soll.
let ungespeicherteAenderungen = false;
let letzterSaveFehlgeschlagen = false;

function doPersist() {
  saveDirty = true;
  ungespeicherteAenderungen = true;
  if (!saveRunner) saveRunner = runSaveLoop().finally(() => { saveRunner = null; });
  return saveRunner;
}
async function runSaveLoop() {
  let ok = true;
  while (saveDirty) {
    saveDirty = false;
    ok = await writeToGateway();
    // Bei Konflikt/Fehler wurde der Stand neu geladen bzw. der Login-Screen
    // gezeigt — dann NICHT blind nachschreiben, das würde den fremden Stand
    // wieder überbügeln.
    if (!ok) { saveDirty = false; break; }
  }
  // Nach einem sauberen Durchlauf ist alles draussen, sonst liegt noch etwas an.
  ungespeicherteAenderungen = !ok;
  letzterSaveFehlgeschlagen = !ok;
  return ok;
}

// Sicherheitsnetz beim Verlassen der Seite: ein noch nicht abgelaufener
// Debounce-Timer und ein gerade laufender fetch gehen beim Entladen beide
// verloren -- der Browser bricht laufende Requests ab. Der keepalive-Request
// ueberlebt das Schliessen des Tabs.
//
// Nachgefragt wird NUR, wenn dieser Weg nicht traegt (Daten ueber der
// 64-KB-Grenze, kein Token, oder der letzte regulaere Versuch schlug schon
// fehl). Sonst kaeme die Rueckfrage bei JEDEM Schliessen kurz nach einer
// Aenderung -- also staendig -- und wuerde reflexhaft weggeklickt, gerade dann
// wenn sie einmal wirklich zaehlt.
window.addEventListener("beforeunload", (e) => {
  if (!ungespeicherteAenderungen) return;
  // Apps mit zusaetzlichem lokalem Datei-Modus duerfen hier nichts ins Gateway
  // schicken: dort ist die lokale Datei die Wahrheit, nicht Nextcloud.
  if (typeof storageMode !== "undefined" && storageMode !== "gateway") return;
  const abgeschickt = gatewaySaveBeacon(appData);
  if (abgeschickt && !letzterSaveFehlgeschlagen) return;
  e.preventDefault();
  e.returnValue = "";
});
async function writeToGateway() {
  setSaveStatus("Speichern…", "pending");
  try {
    appData.meta = Object.assign({}, appData.meta, { stand: new Date().toISOString() });
    await gatewaySave(appData);
    const t = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    setSaveStatus("Gespeichert " + t, "ok");
    return true;
  } catch (e) {
    if (e instanceof ConflictError) { await reloadAfterConflict(); setSaveStatus("Von anderem Gerät aktualisiert", ""); return false; }
    if (e instanceof NotLoggedInError) { showConnectScreen("Sitzung abgelaufen — bitte neu anmelden."); return false; }
    console.error("Speichern fehlgeschlagen", e);
    setSaveStatus("Nicht gespeichert", "error");
    alert("Speichern fehlgeschlagen: " + e.message);
    return false;
  }
}
async function reloadAfterConflict() {
  try {
    const data = await gatewayLoad();
    appData = normalizeData(data);
    renderAll();
    alert("Die Daten wurden zwischenzeitlich auf einem anderen Gerät geändert — die aktuelle Version wurde neu geladen. Bitte die letzte Änderung bei Bedarf erneut vornehmen.");
  } catch (e) {
    console.error("Neuladen nach Konflikt fehlgeschlagen", e);
  }
}

// ---------- Start ----------
function showConnectScreen(errorMsg) {
  // ⚠️ Verstecken ist nicht Räumen. Diese Funktion wird auch MITTEN IM BETRIEB
  // gerufen — ein Speichern scheitert, weil die Sitzung abgelaufen ist. Dann
  // steht bereits alles auf dem Bildschirm, und display:none lässt es nur
  // unsichtbar im DOM zurück: Namen, Adressen, Beträge, offene Formularfelder.
  //
  // Wegwerfen ist hier gefahrlos: der Weg zurück in die App führt ausschließlich
  // über ein Neuladen der Seite (startApp() wird nur aus init() gerufen, nirgends
  // sonst). Wer sich neu anmeldet, bekommt die Seite ohnehin frisch aufgebaut.
  const __huelle = document.getElementById("app-shell");
  if (__huelle) __huelle.innerHTML = "";
  document.getElementById("connect-screen").style.display = "";
  document.getElementById("app-shell").style.display = "none";
  document.getElementById("cloud-error").textContent = errorMsg ? "Fehler: " + errorMsg : "";
}
async function startApp() {
  document.getElementById("connect-screen").style.display = "none";
  document.getElementById("app-shell").style.display = "";
  renderAll();
  try { currentUser = await fetchMe(); } catch (_) { /* best effort */ }
  renderHeaderUser();
  applyEditVisibility();
  renderBusplanGrid();
  // Kommt nach: die Liste fuellt nur Auswahlfelder, der Busplan ist ohne sie
  // schon vollstaendig bedienbar. Ein zweiter Roundtrip soll den ersten Aufbau
  // nicht aufhalten.
  vereinsMannschaften = await fetchVereinsMannschaften();
  renderVereinsListe();
  // Ebenfalls nachgelagert und aus demselben Grund: der Bericht ist Nachlese,
  // keine Voraussetzung fuer die Bedienung.
  erinnerungsBericht = await fetchBusErinnerungen();
  renderErinnerungen();
  // Ebenfalls nachgelagert: die Anfragen liegen in einer eigenen Datei und
  // kosten einen zweiten Roundtrip -- der erste Aufbau soll darauf nicht warten.
  await ladeBusAnfragen();
}

// Fuellt die datalist am Namensfeld. ⚠️ Eine datalist SCHLAEGT nichts vor, was
// nicht drinsteht, verbietet aber auch nichts -- genau das war die Vorgabe:
// die echten Mannschaften zur Auswahl, eigene Namen weiter frei tippbar.
function renderVereinsListe() {
  const dl = document.getElementById("vereins-mannschaften");
  if (!dl) return;
  dl.innerHTML = vereinsMannschaften
    .map((m) => `<option value="${escapeHtml(m.kurz)}">${escapeHtml(m.lang)}${m.liga ? " · " + escapeHtml(m.liga) : ""}</option>`)
    .join("");
}

async function init() {
  setupListeners();
  if (!getSessionToken()) { showConnectScreen(); return; }
  try {
    const data = await gatewayLoad();
    appData = normalizeData(data);
    await startApp();
  } catch (e) {
    if (e instanceof NotLoggedInError) { showConnectScreen(); return; }
    console.error("Nextcloud-Zugriff über Login fehlgeschlagen", e);
    showConnectScreen(e.message);
  }
}

function setupListeners() {
  document.querySelectorAll("nav button").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));

  document.getElementById("season-select").addEventListener("change", (e) => switchSeason(e.target.value));

  // Übersicht: Klick auf Mannschafts-Zeile springt in den Busplan-Tab.
  document.querySelector("#uebersicht-teams tbody").addEventListener("click", (e) => {
    const row = e.target.closest(".data-row");
    if (row) { switchTab("busplan"); selectTeam(row.dataset.team); }
  });
  document.getElementById("konflikte-list").addEventListener("click", (e) => {
    const row = e.target.closest(".konflikt-row");
    if (row) { switchTab("busplan"); selectTeam(row.dataset.team); }
  });
  document.getElementById("btn-export-pdf").addEventListener("click", exportBusplanPdf);

  // Mannschafts-Umschalter (Klick zum Wechseln + Drag-and-Drop zum Sortieren)
  const teamSwitch = document.getElementById("team-switch");
  teamSwitch.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-team]");
    if (btn) selectTeam(btn.dataset.team);
  });
  teamSwitch.addEventListener("dragstart", (e) => {
    const btn = e.target.closest("button[data-team]");
    if (!btn || !canEdit()) { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", btn.dataset.team);
    btn.classList.add("dragging");
  });
  teamSwitch.addEventListener("dragover", (e) => {
    const btn = e.target.closest("button[data-team]");
    if (!btn || !canEdit()) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    teamSwitch.querySelectorAll("button.drag-over").forEach((b) => { if (b !== btn) b.classList.remove("drag-over"); });
    btn.classList.add("drag-over");
  });
  teamSwitch.addEventListener("dragleave", (e) => {
    const btn = e.target.closest("button[data-team]");
    if (btn) btn.classList.remove("drag-over");
  });
  teamSwitch.addEventListener("drop", (e) => {
    const btn = e.target.closest("button[data-team]");
    if (!btn || !canEdit()) return;
    e.preventDefault();
    reorderTeams(e.dataTransfer.getData("text/plain"), btn.dataset.team);
  });
  teamSwitch.addEventListener("dragend", () => {
    teamSwitch.querySelectorAll("button.dragging, button.drag-over").forEach((b) => b.classList.remove("dragging", "drag-over"));
  });
  // ⚠️ Lauscher mit Null-Prüfung. Ein fehlendes Element liefert null, und der
  // TypeError aus addEventListener bricht die RESTLICHE Registrierung in dieser
  // Funktion lautlos mit ab — danach reagiert kein Knopf mehr, ohne dass man es
  // dem Fehlerbild ansieht. Am 2026-08-12 genau so passiert: eine parallele
  // Sitzung hatte einen Knopf aus index.html entfernt, während der Lauscher
  // dafür schon in app.js stand.
  // Name aus der Vereinsliste gewählt -> Liga nachziehen, aber NUR wenn das Feld
  // leer ist: eine von Hand eingetragene Liga (Staffelwechsel mitten in der
  // Saison) darf eine Auswahl nicht überschreiben.
  const tfName = document.getElementById("tf-name");
  if (tfName) tfName.addEventListener("change", (e) => {
    const treffer = vereinsMannschaften.find(
      (m) => m.kurz.toLowerCase() === String(e.target.value || "").trim().toLowerCase());
    const liga = document.getElementById("tf-liga");
    if (treffer && liga && !liga.value.trim()) liga.value = treffer.liga;
  });

  document.getElementById("btn-new-team").addEventListener("click", () => openTeamModal(null));
  document.getElementById("btn-edit-team").addEventListener("click", () => { if (currentTeamId) openTeamModal(currentTeamId); });

  // Busplan-Gitter (Event-Delegation für Status-Zellen + Spiel-Bearbeiten-Buttons)
  document.getElementById("busplan-grid-wrap").addEventListener("click", (e) => {
    const cell = e.target.closest("[data-status-cell]");
    if (cell) { openStatusModal(cell.dataset.spiel, cell.dataset.option); return; }
    const editBtn = e.target.closest("[data-edit-spiel]");
    if (editBtn && currentTeamId) openSpielModal(currentTeamId, editBtn.dataset.editSpiel);
  });
  document.getElementById("btn-new-spiel").addEventListener("click", () => { if (currentTeamId) openSpielModal(currentTeamId, null); });

  // Mannschaft-Modal
  document.getElementById("team-modal-close").addEventListener("click", closeTeamModal);
  document.getElementById("btn-cancel-team").addEventListener("click", closeTeamModal);
  document.getElementById("btn-save-team").addEventListener("click", saveTeam);
  document.getElementById("btn-delete-team").addEventListener("click", deleteTeam);
  document.getElementById("team-modal").addEventListener("click", (e) => { if (e.target.id === "team-modal") closeTeamModal(); });
  document.getElementById("team-form").addEventListener("submit", (e) => { e.preventDefault(); saveTeam(); });

  // Spiel-Modal
  document.getElementById("spiel-modal-close").addEventListener("click", closeSpielModal);
  document.getElementById("btn-cancel-spiel").addEventListener("click", closeSpielModal);
  document.getElementById("btn-save-spiel").addEventListener("click", saveSpiel);
  document.getElementById("btn-delete-spiel").addEventListener("click", deleteSpiel);
  document.getElementById("spiel-modal").addEventListener("click", (e) => { if (e.target.id === "spiel-modal") closeSpielModal(); });
  document.getElementById("spiel-form").addEventListener("submit", (e) => { e.preventDefault(); saveSpiel(); });

  // Status-Modal
  document.getElementById("status-modal-close").addEventListener("click", closeStatusModal);
  document.getElementById("btn-cancel-status").addEventListener("click", closeStatusModal);
  document.getElementById("btn-save-status").addEventListener("click", saveStatus);
  document.getElementById("status-modal").addEventListener("click", (e) => { if (e.target.id === "status-modal") closeStatusModal(); });
  document.getElementById("status-form").addEventListener("submit", (e) => { e.preventDefault(); saveStatus(); });

  // Liste
  ["liste-search", "liste-team"].forEach((id) => {
    document.getElementById(id).addEventListener("input", renderListe);
    document.getElementById(id).addEventListener("change", renderListe);
  });
  document.getElementById("liste-rows").addEventListener("click", (e) => {
    const row = e.target.closest(".list-row");
    if (row) { switchTab("busplan"); selectTeam(row.dataset.team); }
  });

  // Bus-Optionen-Editor (Event-Delegation)
  const bo = document.getElementById("busoptionen-list");
  bo.addEventListener("input", (e) => {
    const idx = e.target.dataset.idx;
    if (idx != null) {
      getSeason().busOptions[Number(idx)].name = e.target.value;
      persist();
      return;
    }
    const ridx = e.target.dataset.regelnIdx;
    if (ridx == null) return;
    getSeason().busOptions[Number(ridx)].regeln = e.target.value;
    autoGrowRegeln(e.target);
    persist();
  });
  bo.addEventListener("click", (e) => {
    const rm = e.target.closest("[data-remove-option]");
    if (!rm) return;
    if (!confirm("Diese Bus-Option und alle zugehörigen Status-Einträge entfernen?")) return;
    getSeason().busOptions.splice(Number(rm.dataset.removeOption), 1);
    cleanupSeasonReferences();
    persist();
    renderAll();
  });
  bo.addEventListener("change", (e) => {
    const aidx = e.target.dataset.abfragbarIdx;
    if (aidx == null) return;
    getSeason().busOptions[Number(aidx)].abfragbar = e.target.checked;
    persist();
    renderBusabfrage();
  });
  document.getElementById("btn-add-busoption").addEventListener("click", () => {
    getSeason().busOptions.push({ id: uuid(), name: "Neue Option", regeln: "", abfragbar: true });
    persist();
    renderBusOptionen();
  });

  // Saison-Verwaltung
  document.getElementById("btn-season-new").addEventListener("click", newSeason);
  document.getElementById("btn-season-duplicate").addEventListener("click", duplicateSeason);
  document.getElementById("btn-season-delete").addEventListener("click", deleteSeason);

  // Import
  document.getElementById("btn-import-seed").addEventListener("click", () => document.getElementById("import-file-input").click());
  document.getElementById("import-file-input").addEventListener("change", (e) => { handleImportFile(e.target.files[0]); e.target.value = ""; });

  // Busabfrage
  const baDatum = document.getElementById("ba-datum");
  if (baDatum) baDatum.addEventListener("change", (e) => {
    abfrageDatum = e.target.value;
    setAbfrageStatus("");
    renderBusabfrage();
  });
  const baHeute = document.getElementById("btn-ba-heute");
  if (baHeute) baHeute.addEventListener("click", () => {
    abfrageDatum = isoTag(0); setAbfrageStatus(""); renderBusabfrage();
  });
  const baMorgen = document.getElementById("btn-ba-morgen");
  if (baMorgen) baMorgen.addEventListener("click", () => {
    abfrageDatum = isoTag(1); setAbfrageStatus(""); renderBusabfrage();
  });
  const baErgebnis = document.getElementById("ba-ergebnis");
  if (baErgebnis) baErgebnis.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-anfragen]");
    if (btn) openAnfrageModal(btn.dataset.anfragen);
  });
  const baAnfragen = document.getElementById("ba-anfragen");
  if (baAnfragen) baAnfragen.addEventListener("click", (e) => {
    const ent = e.target.closest("[data-entscheiden]");
    if (ent) { openEntscheidModal(ent.dataset.entscheiden); return; }
    const del = e.target.closest("[data-anfrage-loeschen]");
    if (del) anfrageEntfernen(del.dataset.anfrageLoeschen);
  });
  // Karte in der Uebersicht: Klick fuehrt dorthin, wo man etwas tun kann.
  const anfKarte = document.getElementById("anfragen-card-list");
  if (anfKarte) anfKarte.addEventListener("click", () => switchTab("busabfrage"));

  // Anfrage-Modal
  document.getElementById("anfrage-modal-close").addEventListener("click", closeAnfrageModal);
  document.getElementById("btn-cancel-anfrage").addEventListener("click", closeAnfrageModal);
  document.getElementById("btn-save-anfrage").addEventListener("click", saveAnfrage);
  document.getElementById("anfrage-modal").addEventListener("click", (e) => { if (e.target.id === "anfrage-modal") closeAnfrageModal(); });
  document.getElementById("anfrage-form").addEventListener("submit", (e) => { e.preventDefault(); saveAnfrage(); });

  // Entscheid-Modal
  document.getElementById("entscheid-modal-close").addEventListener("click", closeEntscheidModal);
  document.getElementById("btn-cancel-entscheid").addEventListener("click", closeEntscheidModal);
  document.getElementById("btn-save-entscheid").addEventListener("click", saveEntscheidung);
  document.getElementById("entscheid-modal").addEventListener("click", (e) => { if (e.target.id === "entscheid-modal") closeEntscheidModal(); });
  document.getElementById("entscheid-form").addEventListener("submit", (e) => { e.preventDefault(); saveEntscheidung(); });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!document.getElementById("entscheid-modal").classList.contains("hidden")) closeEntscheidModal();
    else if (!document.getElementById("anfrage-modal").classList.contains("hidden")) closeAnfrageModal();
    else if (!document.getElementById("status-modal").classList.contains("hidden")) closeStatusModal();
    else if (!document.getElementById("spiel-modal").classList.contains("hidden")) closeSpielModal();
    else if (!document.getElementById("team-modal").classList.contains("hidden")) closeTeamModal();
  });
}

document.addEventListener("DOMContentLoaded", init);
