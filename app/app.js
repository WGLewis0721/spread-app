const STORE_KEY = "spread.v1";
const LICENSE_KEY = "spread.license";
const COLORS = ["#7cb87a", "#c4a35a", "#8aa7c4", "#c46a8a", "#b48ac4"];
const DEFAULTS = [
  { id: "work", name: "Work", hours: 8 },
  { id: "home", name: "Home", hours: 4 },
  { id: "health", name: "Health", hours: 3 },
];
function weekStart(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function weekKey(d) {
  return weekStart(d).toISOString().slice(0, 10);
}
function fmtWeek(key) {
  const s = new Date(key + "T00:00:00");
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  const opt = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString(undefined, opt)} – ${e.toLocaleDateString(undefined, { ...opt, year: "numeric" })}`;
}
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (!saved) return defaultState();
    if (isUntouchedPreset(saved)) return defaultState();
    return saved;
  } catch { return defaultState(); }
}
const PRESET_NAMES = [
  "Student|Work / Job|Family|Health|Friends",
  "Client work|Finding work|Money / admin|Home|Body",
  "Teacher|Parent|Household|Each child focus|Self",
  "Lead / owner|Delivery|People|Pipeline|Self",
  "Work|Home|Health|People|Craft / growth",
];
function isUntouchedPreset(saved) {
  if (!saved || !Array.isArray(saved.hats)) return false;
  const names = saved.hats.map((h) => h.name).join("|");
  if (!PRESET_NAMES.includes(names)) return false;
  const weeks = saved.weeks || {};
  return Object.values(weeks).every((week) => (week.boxes || []).every((box) => !(box.tasks || []).length));
}
function defaultState() {
  const hats = DEFAULTS.map((h, i) => ({ id: h.id, name: h.name, defaultHours: h.hours, color: COLORS[i % COLORS.length] }));
  const currentWeek = weekKey();
  return {
    hats,
    currentWeek,
    weeks: { [currentWeek]: { boxes: hats.map((h) => ({ hatId: h.id, hours: h.defaultHours, tasks: [] })) } },
  };
}
function save(state) { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function ensureWeek(state) {
  const k = state.currentWeek;
  if (!state.weeks[k]) {
    state.weeks[k] = { boxes: state.hats.map((h) => ({ hatId: h.id, hours: h.defaultHours, tasks: [] })) };
  } else {
    for (const h of state.hats) {
      if (!state.weeks[k].boxes.find((b) => b.hatId === h.id)) {
        state.weeks[k].boxes.push({ hatId: h.id, hours: h.defaultHours, tasks: [] });
      }
    }
  }
}
function uid() { return Math.random().toString(36).slice(2, 10); }
let state = load();
state.currentWeek = state.currentWeek || weekKey();
function licensed() {
  const raw = localStorage.getItem(LICENSE_KEY);
  if (!raw) return false;
  try { const o = JSON.parse(raw); return o && o.ok === true; } catch { return false; }
}
function validateLicense(code) {
  const c = (code || "").trim().toUpperCase().replace(/\s+/g, "");
  if (c === "SPR-DEMO-2026") return { ok: true, plan: "demo" };
  const m = /^SPR-([A-Z0-9]{4})-([A-Z0-9]{4})$/.exec(c);
  if (!m) return { ok: false };
  const a = m[1], b = m[2];
  let sum = 0;
  for (const ch of a + b) sum += ch.charCodeAt(0);
  if (sum % 7 === 0 && a !== "0000") return { ok: true, plan: "personal" };
  return { ok: false };
}
function render() {
  const root = document.getElementById("app");
  if (!licensed()) { root.innerHTML = lockScreen(); bindLock(); return; }
  ensureWeek(state); save(state); root.innerHTML = mainScreen(); bindMain();
}
function lockScreen() {
  return `<div class="locked"><div class="logo" style="margin:0 auto 8px">▣</div><h1>Spread</h1><p>The weekly role spread. Allot hours. List the work. $10 one-time. Install it. Data stays on this device.</p><input id="lic" placeholder="License key  SPR-XXXX-XXXX" autocomplete="off" /><button class="primary" id="unlock" style="width:100%">Unlock</button><p style="margin-top:12px;font-size:12px">Trial key: <b>SPR-DEMO-2026</b></p></div>`;
}
function mainScreen() {
  const week = state.weeks[state.currentWeek];
  const hatsById = Object.fromEntries(state.hats.map((h) => [h.id, h]));
  const totalH = week.boxes.reduce((s, b) => s + Number(b.hours || 0), 0);
  const totalT = week.boxes.reduce((s, b) => s + b.tasks.length, 0);
  const doneT = week.boxes.reduce((s, b) => s + b.tasks.filter((t) => t.done).length, 0);
  const boxes = week.boxes.map((box) => {
    const hat = hatsById[box.hatId];
    if (!hat) return "";
    const tasks = box.tasks.map((t) => `<li class="task ${t.done ? "done" : ""}"><input type="checkbox" data-act="toggle" data-hat="${hat.id}" data-tid="${t.id}" ${t.done ? "checked" : ""} /><div><span>${esc(t.text)}</span></div><button class="icon-btn" data-act="del-task" data-hat="${hat.id}" data-tid="${t.id}">×</button></li>`).join("");
    return `<article class="hat" style="border-top: 3px solid ${hat.color || "var(--accent)"}"><header><div><input class="spread-name" data-name="${hat.id}" value="${esc(hat.name)}" aria-label="Name of ${esc(hat.name)}" /><div class="prompt">What is the most important thing in this spread this week?</div></div><span class="hours">${box.hours}h boxed</span></header><ul class="tasks">${tasks || '<li class="task-meta">No tasks yet.</li>'}</ul><div class="add-row"><input data-new="${hat.id}" placeholder="Add a task…" /><button data-act="add" data-hat="${hat.id}">Add</button></div><div class="add-row"><input type="number" min="0" max="40" step="0.5" value="${box.hours}" data-hours="${hat.id}" /><button class="ghost" data-act="hours" data-hat="${hat.id}">Set hours</button><button class="icon-btn" data-act="del-hat" data-hat="${hat.id}" title="Remove role">⌫</button></div></article>`;
  }).join("");
  return `<div class="app"><div class="top"><div class="brand"><div class="logo">▣</div><div><h1>Spread</h1><p>Roles first. Hours second. Tasks last.</p></div></div><div class="week-nav"><button data-act="prev">←</button><div class="week-label">${fmtWeek(state.currentWeek)}</div><button data-act="next">→</button><button data-act="today">This week</button></div></div><div class="stats"><div class="stat"><b>${state.hats.length}</b><span>spreads</span></div><div class="stat"><b>${totalH}h</b><span>boxed this week</span></div><div class="stat"><b>${doneT}/${totalT}</b><span>tasks closed</span></div></div><div class="grid">${boxes || emptyHats()}<article class="hat new-life"><h2>New Life</h2><p class="prompt">Make your own spreads. Name them. Give them hours.</p><button class="primary" data-act="new-life" style="width:100%">New Life</button></article></div><div class="bar"><button data-act="new-hat">+ New role</button><button data-act="copy">Copy last week</button><button data-act="export">Export JSON</button><button data-act="install" id="installBtn">Install app</button><button data-act="print">Print week</button></div></div><div id="modal"></div>`;
}
function emptyHats() { return `<article class="hat"><h2>No spreads yet</h2><p class="prompt">Use New Life to name your own.</p></article>`; }
function esc(s) {
  return String(s || "")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);
}
function boxFor(hatId) { return state.weeks[state.currentWeek].boxes.find((b) => b.hatId === hatId); }
function bindLock() {
  document.getElementById("unlock").onclick = () => {
    const v = validateLicense(document.getElementById("lic").value);
    if (!v.ok) { alert("That key is not valid."); return; }
    localStorage.setItem(LICENSE_KEY, JSON.stringify(v));
    if (!state.hats.length) state = defaultState();
    render();
  };
}

function bindMain() {
  document.querySelectorAll("[data-act]").forEach((el) => el.addEventListener("click", onAct));
  document.querySelectorAll("[data-new]").forEach((inp) => {
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") addTask(inp.dataset.new, inp.value); });
  });
  document.querySelectorAll("[data-name]").forEach((inp) => {
    inp.addEventListener("change", () => renameHat(inp.dataset.name, inp.value));
  });
}
function renameHat(id, name) {
  const hat = state.hats.find((h) => h.id === id);
  if (!hat) return;
  name = (name || "").trim();
  if (!name) return;
  hat.name = name;
  save(state);
}
function onAct(e) {
  const act = e.currentTarget.dataset.act;
  const hatId = e.currentTarget.dataset.hat;
  const tid = e.currentTarget.dataset.tid;
  if (act === "prev" || act === "next" || act === "today") {
    const d = new Date(state.currentWeek + "T00:00:00");
    if (act === "prev") d.setDate(d.getDate() - 7);
    if (act === "next") d.setDate(d.getDate() + 7);
    state.currentWeek = act === "today" ? weekKey() : weekKey(d);
    render(); return;
  }
  if (act === "add") { addTask(hatId, document.querySelector(`[data-new="${hatId}"]`).value); return; }
  if (act === "toggle") { const t = boxFor(hatId).tasks.find((x) => x.id === tid); if (t) t.done = !t.done; save(state); render(); return; }
  if (act === "del-task") { const box = boxFor(hatId); box.tasks = box.tasks.filter((x) => x.id !== tid); save(state); render(); return; }
  if (act === "hours") {
    const inp = document.querySelector(`[data-hours="${hatId}"]`);
    boxFor(hatId).hours = Number(inp.value || 0);
    const hat = state.hats.find((h) => h.id === hatId);
    if (hat) hat.defaultHours = Number(inp.value || 0);
    save(state); render(); return;
  }
  if (act === "del-hat") {
    if (!confirm("Remove this spread?")) return;
    state.hats = state.hats.filter((h) => h.id !== hatId);
    Object.values(state.weeks).forEach((w) => { w.boxes = w.boxes.filter((b) => b.hatId !== hatId); });
    save(state); render(); return;
  }
  if (act === "new-hat") return openNewHat();
  if (act === "new-life") return openNewLife();
  if (act === "copy") return copyLast();
  if (act === "export") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
    a.download = `spread-${state.currentWeek}.json`; a.click(); return;
  }
  if (act === "print") { window.print(); return; }
  if (act === "install") {
    if (deferredPrompt) deferredPrompt.prompt();
    else alert("Use your browser Install / Add to Home Screen.");
  }
}
function addTask(hatId, text) {
  text = (text || "").trim();
  if (!text) return;
  boxFor(hatId).tasks.push({ id: uid(), text, done: false });
  save(state); render();
}
function openNewHat() {
  document.getElementById("modal").innerHTML = `<div class="modal-bg"><div class="modal"><h3>New role</h3><p>A role, not a project. Parent. Student. Shop owner.</p><div class="field"><label>Name</label><input id="hn" /></div><div class="field"><label>Default hours / week</label><input id="hh" type="number" value="2" min="0.5" step="0.5" /></div><div class="row"><button class="ghost" id="cancel">Cancel</button><button class="primary" id="saveh">Save role</button></div></div></div>`;
  document.getElementById("cancel").onclick = () => (document.getElementById("modal").innerHTML = "");
  document.getElementById("saveh").onclick = () => {
    const name = document.getElementById("hn").value.trim();
    if (!name) return;
    const hours = Number(document.getElementById("hh").value || 2);
    const hat = { id: uid(), name, defaultHours: hours, color: "#7cb87a" };
    state.hats.push(hat); ensureWeek(state); boxFor(hat.id).hours = hours; save(state); render();
  };
}
function openNewLife() {
  document.getElementById("modal").innerHTML = `<div class="modal-bg"><div class="modal"><h3>New Life</h3><p>Name a spread and give it hours. Add as many as you live.</p><div class="field"><label>Name</label><input id="ln" placeholder="Parent, shop, study" /></div><div class="field"><label>Hours / week</label><input id="lh" type="number" value="2" min="0.5" step="0.5" /></div><div class="row"><button class="ghost" id="cancel">Done</button><button class="primary" id="addlife">Add spread</button></div></div></div>`;
  const close = () => (document.getElementById("modal").innerHTML = "");
  document.getElementById("cancel").onclick = close;
  document.getElementById("addlife").onclick = () => {
    const name = document.getElementById("ln").value.trim();
    if (!name) return;
    const hours = Number(document.getElementById("lh").value || 2);
    const hat = { id: uid(), name, defaultHours: hours, color: COLORS[state.hats.length % COLORS.length] };
    state.hats.push(hat);
    ensureWeek(state);
    boxFor(hat.id).hours = hours;
    save(state);
    render();
    openNewLife();
  };
}
function copyLast() {
  const d = new Date(state.currentWeek + "T00:00:00"); d.setDate(d.getDate() - 7);
  const src = state.weeks[weekKey(d)];
  if (!src) { alert("No previous week to copy."); return; }
  state.weeks[state.currentWeek] = JSON.parse(JSON.stringify(src));
  state.weeks[state.currentWeek].boxes.forEach((b) => b.tasks.forEach((t) => (t.done = false)));
  save(state); render();
}
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredPrompt = e; });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
render();
