"use strict";

/* ===================== Config ===================== */
const STORE_KEY = "utsav-sampark-v1";

const STATUSES = [
  { id: "pending", label: "બાકી",           color: "var(--s-pending)" },
  { id: "yes",     label: "આવશે",           color: "var(--s-yes)" },
  { id: "later",   label: "ફરી ફોન કરવો",   color: "var(--s-later)" },
  { id: "noans",   label: "ફોન ન લાગ્યો",   color: "var(--s-noans)" },
  { id: "no",      label: "નહીં આવે",       color: "var(--s-no)" },
];
const STATUS = Object.fromEntries(STATUSES.map(s => [s.id, s]));

const DEFAULT_TEMPLATE =
  "જય સ્વામિનારાયણ {નામ},\n" +
  "{ઉત્સવ} – {તારીખ} ના રોજ {સ્થળ} ખાતે ઉજવાશે. આપને સહપરિવાર પધારવા ભાવભર્યું આમંત્રણ છે. 🙏\n" +
  "– {સ્વયંસેવક}, ઉત્સવ સંપર્ક સેવા";

const SAMPLE = [
  ["રમેશભાઈ પટેલ", "9825012345", "નારણપુરા", "yes", 4],
  ["હિતેશભાઈ શાહ", "9879023456", "સેટેલાઇટ", "pending", 0],
  ["કિરણબેન દવે", "9428034567", "મણિનગર", "later", 0],
  ["જયેશભાઈ ભટ્ટ", "9898045678", "બોપલ", "pending", 0],
  ["મીનાબેન પંડ્યા", "9327056789", "વાડજ", "yes", 3],
  ["પ્રકાશભાઈ ચૌધરી", "9909067890", "ગોતા", "noans", 0],
  ["નીલેશભાઈ જોષી", "9737078901", "ચાંદખેડા", "pending", 0],
  ["ભાવનાબેન ત્રિવેદી", "9824089012", "પાલડી", "no", 0],
  ["અશોકભાઈ મકવાણા", "9426090123", "નિકોલ", "pending", 0],
  ["દિનેશભાઈ પરમાર", "9978001234", "ઘાટલોડિયા", "yes", 5],
  ["સંગીતાબેન મહેતા", "9825112233", "વસ્ત્રાપુર", "pending", 0],
  ["વિપુલભાઈ સોલંકી", "9913223344", "નરોડા", "later", 0],
];

// True inside the Android app (Capacitor), false in a normal browser / installed web app.
const IS_NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

// Open WhatsApp and other external links outside the app. In the Android app the
// WebView hands a top-level navigation to an external URL over to the system (WhatsApp, dialer).
function openExternal(url) {
  if (IS_NATIVE) location.href = url;
  else window.open(url, "_blank", "noopener");
}
if (IS_NATIVE) {
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest('a[target="_blank"]');
    if (a) { e.preventDefault(); location.href = a.href; }
  });
}

/* ===================== State ===================== */
function defaultState() {
  const now = Date.now();
  return {
    settings: {
      utsav: "વાર્ષિક ઉત્સવ",
      date: "2026-11-29",
      venue: "મંદિર પરિસર",
      volunteer: "સ્વયંસેવક",
      template: DEFAULT_TEMPLATE,
    },
    contacts: SAMPLE.map(([name, phone, area, status, guests], i) => ({
      id: "c" + (i + 1),
      name, phone, area, status, guests,
      note: "",
      updatedAt: status === "pending" ? 0 : now - (i + 1) * 3600e3,
      history: status === "pending" ? [] : [{ t: now - (i + 1) * 3600e3, text: "સ્થિતિ: " + STATUS[status].label }],
    })),
  };
}

let state = load();
const ui = { tab: "home", detailId: null, editId: null, filter: "all", query: "" };

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.contacts) && s.settings) return s;
    }
  } catch (e) { /* storage unavailable */ }
  return defaultState();
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

/* ===================== Helpers ===================== */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const GU_MONTHS = ["જાન્યુઆરી","ફેબ્રુઆરી","માર્ચ","એપ્રિલ","મે","જૂન","જુલાઈ","ઑગસ્ટ","સપ્ટેમ્બર","ઑક્ટોબર","નવેમ્બર","ડિસેમ્બર"];

function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${GU_MONTHS[m - 1]} ${y}`;
}
function fmtTime(t) {
  const d = new Date(t);
  const hh = d.getHours(), mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${GU_MONTHS[d.getMonth()].slice(0, 4)}, ${hh}:${mm}`;
}
function daysLeft(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 864e5);
}
function initial(name) { return (name || "?").trim().charAt(0); }
function digits(p) { return String(p || "").replace(/\D/g, ""); }
function waNumber(p) {
  const d = digits(p);
  return d.length === 10 ? "91" + d : d.replace(/^0+/, "");
}
function prettyPhone(p) {
  const d = digits(p);
  return d.length === 10 ? d.slice(0, 5) + " " + d.slice(5) : p;
}
function inviteText(c) {
  const s = state.settings;
  return (s.template || DEFAULT_TEMPLATE)
    .replaceAll("{નામ}", c.name)
    .replaceAll("{ઉત્સવ}", s.utsav)
    .replaceAll("{તારીખ}", fmtDate(s.date))
    .replaceAll("{સ્થળ}", s.venue)
    .replaceAll("{સ્વયંસેવક}", s.volunteer);
}
function counts() {
  const c = Object.fromEntries(STATUSES.map(s => [s.id, 0]));
  let guests = 0;
  for (const x of state.contacts) { c[x.status] = (c[x.status] || 0) + 1; if (x.status === "yes") guests += Number(x.guests) || 0; }
  return { ...c, total: state.contacts.length, done: state.contacts.length - c.pending, guests };
}
function getContact(id) { return state.contacts.find(c => c.id === id); }
function logHistory(c, text) {
  c.history = c.history || [];
  c.history.unshift({ t: Date.now(), text });
  c.updatedAt = Date.now();
}
function badge(status) {
  const s = STATUS[status] || STATUS.pending;
  return `<span class="badge st-${s.id}"><span class="dot" style="background:${s.color}"></span>${s.label}</span>`;
}

const ICON = {
  phone: `<svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>`,
  wa: `<svg viewBox="0 0 24 24"><path d="M3 21l1.6-4.8A8.5 8.5 0 1 1 8 19.6z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.3-1.8-.9-.8.8a4 4 0 0 1-2.2-2.2l.8-.8-.9-1.8z" stroke-width="1.4"/></svg>`,
  search: `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`,
  users: `<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>`,
  next: `<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  download: `<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>`,
};

/* ===================== Rendering ===================== */
const view = $("#view");

function setHeader(title, sub, back) {
  $("#topTitle").textContent = title;
  $("#topSub").textContent = sub || "";
  $("#backBtn").hidden = !back;
  $("#topLogo").hidden = !!back;
}

function render() {
  document.querySelectorAll("#tabbar button").forEach(b => b.classList.toggle("active", b.dataset.tab === ui.tab && !ui.detailId));
  $("#tabbar").classList.toggle("hidden", !!ui.detailId || !!ui.editId);
  if (ui.detailId) return renderDetail();
  if (ui.editId) return renderForm(ui.editId);
  ({ home: renderHome, list: renderList, add: () => renderForm(null), report: renderReport })[ui.tab]();
  view.scrollTop = 0;
}

/* ---------- Home ---------- */
function renderHome() {
  const s = state.settings;
  const c = counts();
  const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
  const dl = daysLeft(s.date);
  const dlText = dl == null ? "" : dl > 0 ? `${dl} દિવસ બાકી` : dl === 0 ? "આજે ઉત્સવ છે" : "ઉત્સવ પૂર્ણ";
  const R = 40, C = 2 * Math.PI * R;
  setHeader("ઉત્સવ સંપર્ક સેવા", `જય સ્વામિનારાયણ, ${s.volunteer}`, false);

  const followUps = state.contacts.filter(x => x.status === "later" || x.status === "noans");

  view.innerHTML = `
    <div class="hero">
      <div class="ring">
        <svg viewBox="0 0 92 92"><circle class="track" cx="46" cy="46" r="${R}"/>
          <circle class="bar" cx="46" cy="46" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}"/></svg>
        <div class="pct">${pct}%</div>
      </div>
      <div>
        <h2>${esc(s.utsav)}</h2>
        <p>${esc(fmtDate(s.date))} · ${esc(s.venue)}</p>
        <p><b>${c.done}</b> / ${c.total} સંપર્ક પૂર્ણ</p>
        ${dlText ? `<span class="days">${dlText}</span>` : ""}
      </div>
    </div>

    <div class="stats">
      ${STATUSES.map(st => `
        <button class="stat" data-filter="${st.id}">
          <span class="n" style="color:${st.color}">${c[st.id]}</span>
          <span class="l"><span class="dot" style="background:${st.color}"></span>${st.label}</span>
        </button>`).join("")}
      <div class="stat">
        <span class="n" style="color:var(--maroon)">${c.guests}</span>
        <span class="l">કુલ આવનાર વ્યક્તિ</span>
      </div>
    </div>

    <div style="margin-top:16px">
      <button class="cta" id="nextBtn">${ICON.phone} આગળનો સંપર્ક શરૂ કરો</button>
    </div>

    <div class="section-title">ફરી સંપર્ક કરવાના (${followUps.length})</div>
    ${followUps.length ? `<div class="list">${followUps.map(rowHTML).join("")}</div>`
      : `<div class="card empty" style="padding:20px">કોઈ બાકી નથી 🙏</div>`}
  `;

  view.querySelectorAll(".stat[data-filter]").forEach(b => b.onclick = () => { ui.filter = b.dataset.filter; go("list"); });
  $("#nextBtn").onclick = () => {
    const next = state.contacts.find(x => x.status === "pending") || followUps[0];
    if (next) openDetail(next.id); else toast("બધા સંપર્ક પૂર્ણ થઈ ગયા! 🙏");
  };
  bindRows();
}

/* ---------- List ---------- */
function rowHTML(c) {
  const meta = [c.area, prettyPhone(c.phone)].filter(Boolean).join(" · ");
  return `
    <div class="row" data-id="${esc(c.id)}" role="button" tabindex="0">
      <div class="avatar">${esc(initial(c.name))}</div>
      <div class="info">
        <div class="name">${esc(c.name)}</div>
        <div class="meta">${esc(meta)}</div>
        <div style="margin-top:4px">${badge(c.status)}${c.status === "yes" && c.guests ? ` <span class="meta" style="font-size:12px">· ${c.guests} વ્યક્તિ</span>` : ""}</div>
      </div>
      <div class="quick">
        <a class="qbtn call" href="tel:${esc(digits(c.phone))}" data-act="call" aria-label="ફોન">${ICON.phone}</a>
        <a class="qbtn wa" href="https://wa.me/${esc(waNumber(c.phone))}?text=${encodeURIComponent(inviteText(c))}" target="_blank" rel="noopener" data-act="wa" aria-label="WhatsApp">${ICON.wa}</a>
      </div>
    </div>`;
}
function bindRows() {
  view.querySelectorAll(".row[data-id]").forEach(r => {
    const id = r.dataset.id;
    r.onclick = e => {
      const a = e.target.closest("a[data-act]");
      if (a) { recordOutreach(id, a.dataset.act); return; }
      openDetail(id);
    };
    r.onkeydown = e => { if (e.key === "Enter") openDetail(id); };
  });
}

function renderList() {
  const c = counts();
  setHeader("સંપર્ક યાદી", `${c.total} સંપર્ક · ${c.pending} બાકી`, false);
  const filters = [{ id: "all", label: "બધા", n: c.total }, ...STATUSES.map(s => ({ id: s.id, label: s.label, n: c[s.id] }))];

  view.innerHTML = `
    <div class="search">${ICON.search}<input id="q" type="search" placeholder="નામ, વિસ્તાર કે ફોન શોધો" value="${esc(ui.query)}"></div>
    <div class="chips">${filters.map(f => `<button class="chip ${ui.filter === f.id ? "active" : ""}" data-f="${f.id}">${f.label} <span class="c">${f.n}</span></button>`).join("")}</div>
    <div class="list" id="listBox"></div>`;

  const draw = () => {
    const q = ui.query.trim().toLowerCase();
    const order = { pending: 0, later: 1, noans: 2, yes: 3, no: 4 };
    const items = state.contacts
      .filter(x => ui.filter === "all" || x.status === ui.filter)
      .filter(x => !q || [x.name, x.area, x.phone].join(" ").toLowerCase().includes(q) || digits(x.phone).includes(digits(q) || "\u0000"))
      .sort((a, b) => (order[a.status] - order[b.status]) || a.name.localeCompare(b.name, "gu"));
    $("#listBox").innerHTML = items.length ? items.map(rowHTML).join("")
      : `<div class="empty">${ICON.users}<div>કોઈ સંપર્ક મળ્યો નથી</div></div>`;
    bindRows();
  };
  draw();
  $("#q").oninput = e => { ui.query = e.target.value; draw(); };
  view.querySelectorAll(".chip").forEach(ch => ch.onclick = () => {
    ui.filter = ch.dataset.f;
    view.querySelectorAll(".chip").forEach(x => x.classList.toggle("active", x === ch));
    draw();
  });
}

/* ---------- Detail ---------- */
function openDetail(id) { ui.detailId = id; ui.editId = null; render(); window.scrollTo(0, 0); }

function recordOutreach(id, act) {
  const c = getContact(id);
  if (!c) return;
  logHistory(c, act === "call" ? "ફોન કર્યો" : "WhatsApp આમંત્રણ મોકલ્યું");
  save();
  // After the user returns from the dialer / WhatsApp, open the contact to record the reply.
  setTimeout(() => { if (ui.detailId !== id) openDetail(id); else render(); }, 400);
}

function renderDetail() {
  const c = getContact(ui.detailId);
  if (!c) { ui.detailId = null; return render(); }
  setHeader(c.name, c.area, true);

  view.innerHTML = `
    <div class="card profile">
      <div class="avatar">${esc(initial(c.name))}</div>
      <h2>${esc(c.name)}</h2>
      <div class="meta">${esc(c.area || "")}</div>
      <div class="phone">${esc(prettyPhone(c.phone))}</div>
      <div style="margin-top:8px">${badge(c.status)}</div>
      <div class="actions">
        <a class="action call" href="tel:${esc(digits(c.phone))}" data-act="call">${ICON.phone} ફોન કરો</a>
        <a class="action wa" href="https://wa.me/${esc(waNumber(c.phone))}?text=${encodeURIComponent(inviteText(c))}" target="_blank" rel="noopener" data-act="wa">${ICON.wa} WhatsApp</a>
      </div>
    </div>

    <div class="section-title">જવાબ નોંધો</div>
    <div class="status-grid">
      ${STATUSES.filter(s => s.id !== "pending").map(s => `
        <button class="status-opt ${c.status === s.id ? "sel st-" + s.id : ""}" data-s="${s.id}">
          <span class="dot" style="background:${s.color}"></span>${s.label}
        </button>`).join("")}
    </div>

    <div class="card stepper" style="margin-top:12px" ${c.status === "yes" ? "" : "hidden"} id="guestCard">
      <div><b>કેટલા વ્યક્તિ આવશે?</b><div class="meta" style="font-size:13px;color:var(--muted)">પરિવાર સહિત</div></div>
      <div class="ctrl">
        <button id="gMinus" aria-label="ઓછા">−</button>
        <span class="val" id="gVal">${c.guests || 0}</span>
        <button id="gPlus" aria-label="વધુ">+</button>
      </div>
    </div>

    <div class="section-title">નોંધ</div>
    <div class="field" style="margin:0">
      <textarea id="note" placeholder="દા.ત. સાંજે ૭ પછી ફોન કરવો">${esc(c.note)}</textarea>
    </div>

    <div style="display:flex;gap:10px;margin-top:16px">
      <button class="cta secondary" id="editBtn" style="flex:1">ફેરફાર</button>
      <button class="cta" id="nextBtn" style="flex:2">સાચવો, આગળ ${ICON.next}</button>
    </div>

    <div class="section-title">ઇતિહાસ</div>
    <div class="card">
      ${c.history && c.history.length
        ? `<ul class="history">${c.history.slice(0, 20).map(h => `<li><time>${fmtTime(h.t)}</time><span>${esc(h.text)}</span></li>`).join("")}</ul>`
        : `<div class="meta" style="color:var(--muted)">હજુ સંપર્ક થયો નથી</div>`}
    </div>
  `;

  view.querySelectorAll("a[data-act]").forEach(a => a.onclick = () => recordOutreach(c.id, a.dataset.act));

  view.querySelectorAll(".status-opt").forEach(b => b.onclick = () => {
    const s = b.dataset.s;
    if (c.status === s) return;
    c.status = s;
    if (s === "yes" && !c.guests) c.guests = 1;
    if (s !== "yes") c.guests = 0;
    logHistory(c, "સ્થિતિ: " + STATUS[s].label + (s === "yes" ? ` (${c.guests} વ્યક્તિ)` : ""));
    save(); renderDetail();
    toast("સ્થિતિ નોંધાઈ: " + STATUS[s].label);
  });

  const setGuests = n => { c.guests = Math.max(1, Math.min(50, n)); $("#gVal").textContent = c.guests; c.updatedAt = Date.now(); save(); };
  if ($("#gMinus")) {
    $("#gMinus").onclick = () => setGuests((c.guests || 1) - 1);
    $("#gPlus").onclick = () => setGuests((c.guests || 0) + 1);
  }

  const saveNote = () => {
    const v = $("#note").value.trim();
    if (v !== (c.note || "")) { c.note = v; logHistory(c, "નોંધ: " + v); save(); }
  };
  $("#note").onblur = saveNote;
  $("#editBtn").onclick = () => { saveNote(); ui.editId = c.id; ui.detailId = null; render(); };
  $("#nextBtn").onclick = () => {
    saveNote();
    const idx = state.contacts.indexOf(c);
    const rest = [...state.contacts.slice(idx + 1), ...state.contacts.slice(0, idx)];
    const next = rest.find(x => x.status === "pending");
    if (next) { toast("સચવાયું ✓"); openDetail(next.id); }
    else { toast("બધા બાકી સંપર્ક પૂર્ણ! 🙏"); ui.detailId = null; ui.tab = "home"; render(); }
  };
}

/* ---------- Add / Edit form ---------- */
function renderForm(id) {
  const c = id ? getContact(id) : null;
  setHeader(c ? "સંપર્ક સુધારો" : "નવો સંપર્ક ઉમેરો", c ? c.name : "", !!c);
  const areas = [...new Set(state.contacts.map(x => x.area).filter(Boolean))];

  view.innerHTML = `
    <form id="cform" class="card" novalidate>
      <div class="field" id="fName">
        <label for="name">નામ *</label>
        <input id="name" autocomplete="name" value="${esc(c?.name || "")}" placeholder="દા.ત. રમેશભાઈ પટેલ">
        <span class="err">નામ લખો</span>
      </div>
      <div class="field" id="fPhone">
        <label for="phone">મોબાઇલ નંબર *</label>
        <input id="phone" type="tel" inputmode="tel" value="${esc(c?.phone || "")}" placeholder="10 આંકડાનો નંબર">
        <span class="err">સાચો મોબાઇલ નંબર લખો</span>
      </div>
      <div class="field">
        <label for="area">વિસ્તાર / ગામ</label>
        <input id="area" list="areaList" value="${esc(c?.area || "")}" placeholder="દા.ત. નારણપુરા">
        <datalist id="areaList">${areas.map(a => `<option value="${esc(a)}">`).join("")}</datalist>
      </div>
      <div class="field">
        <label for="note">નોંધ</label>
        <textarea id="fnote" placeholder="વૈકલ્પિક">${esc(c?.note || "")}</textarea>
      </div>
      <button class="cta" type="submit">${c ? "સાચવો" : "સંપર્ક ઉમેરો"}</button>
    </form>
    ${c ? `<button class="danger-link" id="delBtn">આ સંપર્ક કાઢી નાખો</button>` : ""}
  `;

  $("#cform").onsubmit = e => {
    e.preventDefault();
    const name = $("#name").value.trim();
    const phone = $("#phone").value.trim();
    const okName = !!name, okPhone = digits(phone).length >= 10;
    $("#fName").classList.toggle("invalid", !okName);
    $("#fPhone").classList.toggle("invalid", !okPhone);
    if (!okName || !okPhone) return;

    const dup = state.contacts.find(x => x !== c && digits(x.phone).slice(-10) === digits(phone).slice(-10));
    if (dup && !confirm(`આ નંબર "${dup.name}" પાસે પહેલેથી છે. છતાં સાચવવું?`)) return;

    const area = $("#area").value.trim(), note = $("#fnote").value.trim();
    if (c) {
      Object.assign(c, { name, phone, area, note });
      c.updatedAt = Date.now();
      save(); toast("સુધારો સચવાયો ✓");
      ui.editId = null; openDetail(c.id);
    } else {
      const nc = { id: "c" + Date.now().toString(36), name, phone, area, note, status: "pending", guests: 0, updatedAt: 0, history: [] };
      state.contacts.push(nc);
      save(); toast("સંપર્ક ઉમેરાયો ✓");
      openDetail(nc.id);
    }
  };
  if (c) $("#delBtn").onclick = () => {
    if (!confirm(`"${c.name}" ને કાઢી નાખવા છે?`)) return;
    state.contacts = state.contacts.filter(x => x !== c);
    save(); toast("કાઢી નાખ્યો");
    ui.editId = null; ui.tab = "list"; render();
  };
}

/* ---------- Report ---------- */
function renderReport() {
  const c = counts();
  setHeader("રિપોર્ટ", state.settings.utsav, false);
  const byArea = {};
  for (const x of state.contacts) {
    const a = x.area || "અન્ય";
    byArea[a] = byArea[a] || { total: 0, done: 0, guests: 0 };
    byArea[a].total++;
    if (x.status !== "pending") byArea[a].done++;
    if (x.status === "yes") byArea[a].guests += Number(x.guests) || 0;
  }
  const areas = Object.entries(byArea).sort((a, b) => b[1].total - a[1].total);

  view.innerHTML = `
    <div class="card">
      <div class="meta" style="color:var(--muted);font-size:14px">ઉત્સવમાં આવનાર કુલ વ્યક્તિ</div>
      <div class="big-num"><span class="n">${c.guests}</span><span>વ્યક્તિ · ${c.yes} પરિવાર</span></div>
    </div>

    <div class="section-title">સ્થિતિ પ્રમાણે</div>
    <div class="card bars">
      ${STATUSES.map(s => {
        const p = c.total ? (c[s.id] / c.total) * 100 : 0;
        return `<div class="bar-row"><div class="top"><span>${s.label}</span><b>${c[s.id]}</b></div>
          <div class="track"><div class="fill" style="width:${p}%;background:${s.color}"></div></div></div>`;
      }).join("")}
    </div>

    <div class="section-title">વિસ્તાર પ્રમાણે</div>
    <div class="card" style="padding:8px 14px">
      <table class="table">
        <thead><tr><th>વિસ્તાર</th><th class="num">સંપર્ક</th><th class="num">પૂર્ણ</th><th class="num">આવશે</th></tr></thead>
        <tbody>${areas.map(([a, v]) => `<tr><td>${esc(a)}</td><td class="num">${v.total}</td><td class="num">${v.done}</td><td class="num">${v.guests}</td></tr>`).join("")}</tbody>
      </table>
    </div>

    <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px">
      <button class="cta" id="shareBtn">${ICON.wa} સારાંશ WhatsApp પર મોકલો</button>
      <button class="cta secondary" id="csvBtn">${ICON.download} યાદી CSV ડાઉનલોડ</button>
    </div>
  `;

  $("#shareBtn").onclick = () => {
    const s = state.settings;
    const lines = [
      `*${s.utsav} – સંપર્ક સેવા રિપોર્ટ*`,
      `સ્વયંસેવક: ${s.volunteer}`,
      `કુલ સંપર્ક: ${c.total} | પૂર્ણ: ${c.done}`,
      ...STATUSES.map(st => `${st.label}: ${c[st.id]}`),
      `આવનાર કુલ વ્યક્તિ: ${c.guests}`,
    ];
    openExternal("https://wa.me/?text=" + encodeURIComponent(lines.join("\n")));
  };
  $("#csvBtn").onclick = downloadCSV;
}

async function downloadCSV() {
  const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["નામ", "ફોન", "વિસ્તાર", "સ્થિતિ", "આવનાર વ્યક્તિ", "નોંધ", "છેલ્લો ફેરફાર"]];
  for (const x of state.contacts) rows.push([x.name, x.phone, x.area, STATUS[x.status]?.label, x.guests || 0, x.note, x.updatedAt ? new Date(x.updatedAt).toLocaleString("en-IN") : ""]);
  const csv = "﻿" + rows.map(r => r.map(cell).join(",")).join("\n");

  // Android app: the WebView can't download blobs, so write a file and open the share sheet.
  if (IS_NATIVE) {
    try {
      const { Filesystem, Share } = window.Capacitor.Plugins;
      const { uri } = await Filesystem.writeFile({ path: "utsav-sampark.csv", data: csv, directory: "CACHE", encoding: "utf8" });
      await Share.share({ title: "ઉત્સવ સંપર્ક યાદી", files: [uri] });
    } catch (e) {
      if (!/cancel/i.test(String(e && e.message))) toast("ફાઇલ શેર ન થઈ શકી");
    }
    return;
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "utsav-sampark.csv";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- Settings sheet ---------- */
function openSettings() {
  const s = state.settings;
  const sheet = $("#sheet");
  sheet.innerHTML = `
    <div class="grab"></div>
    <h3>ઉત્સવ સેટિંગ્સ</h3>
    <div class="field"><label for="sUtsav">ઉત્સવનું નામ</label><input id="sUtsav" value="${esc(s.utsav)}"></div>
    <div class="field"><label for="sDate">તારીખ</label><input id="sDate" type="date" value="${esc(s.date)}"></div>
    <div class="field"><label for="sVenue">સ્થળ</label><input id="sVenue" value="${esc(s.venue)}"></div>
    <div class="field"><label for="sVol">સ્વયંસેવકનું નામ</label><input id="sVol" value="${esc(s.volunteer)}"></div>
    <div class="field"><label for="sTpl">WhatsApp આમંત્રણ સંદેશ</label>
      <textarea id="sTpl" style="min-height:130px">${esc(s.template)}</textarea>
      <span style="font-size:12.5px;color:var(--muted)">વાપરી શકાય: {નામ} {ઉત્સવ} {તારીખ} {સ્થળ} {સ્વયંસેવક}</span>
    </div>
    <button class="cta" id="sSave">સાચવો</button>
    <button class="danger-link" id="sReset">નમૂના ડેટા ફરી લોડ કરો</button>
  `;
  sheet.hidden = false; $("#sheetBackdrop").hidden = false;

  $("#sSave").onclick = () => {
    Object.assign(state.settings, {
      utsav: $("#sUtsav").value.trim() || "ઉત્સવ",
      date: $("#sDate").value,
      venue: $("#sVenue").value.trim(),
      volunteer: $("#sVol").value.trim() || "સ્વયંસેવક",
      template: $("#sTpl").value.trim() || DEFAULT_TEMPLATE,
    });
    save(); closeSheet(); render(); toast("સેટિંગ્સ સચવાઈ ✓");
  };
  $("#sReset").onclick = () => {
    if (!confirm("બધા સંપર્ક અને નોંધો ભૂંસાઈ જશે. ચાલુ રાખવું?")) return;
    state = defaultState(); save(); closeSheet();
    ui.tab = "home"; ui.detailId = ui.editId = null; render();
  };
}
function closeSheet() { $("#sheet").hidden = true; $("#sheetBackdrop").hidden = true; }

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2000);
}

/* ===================== Navigation ===================== */
function go(tab) {
  ui.tab = tab; ui.detailId = null; ui.editId = null;
  if (tab !== "list") ui.query = "";
  render(); window.scrollTo(0, 0);
}

document.querySelectorAll("#tabbar button").forEach(b => b.onclick = () => {
  if (b.dataset.tab === "list" && ui.tab !== "list") ui.filter = "all";
  go(b.dataset.tab);
});
$("#backBtn").onclick = () => {
  if (ui.editId) { const id = ui.editId; ui.editId = null; openDetail(id); return; }
  ui.detailId = null; render(); window.scrollTo(0, 0);
};
$("#settingsBtn").onclick = openSettings;
$("#sheetBackdrop").onclick = closeSheet;
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });

render();

if (!IS_NATIVE && "serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
