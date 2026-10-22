"use strict";
// Admin panel for founders: studios, editor with validation, AI import, test chat, history.
// Plain JS without a build step; every piece of user data goes through textContent (no innerHTML).

const $app = document.getElementById("app");
const S = { me: null, studios: [], cur: null, tab: "overview", chat: {}, checks: {}, lastHash: "" };

// --- constants -------------------------------------------------------------------------------

const DAYS = [
  ["mon", "Понеділок"], ["tue", "Вівторок"], ["wed", "Середа"], ["thu", "Четвер"],
  ["fri", "Пʼятниця"], ["sat", "Субота"], ["sun", "Неділя"],
];
const LANGS = { uk: "Українська", ru: "Російська", en: "Англійська", pl: "Польська" };
const MODES = {
  draft: ["Чернетки", "Кожну відповідь погоджує майстер кнопкою в Owner Bot. Для перших днів."],
  offhours: ["Поза годинами", "Вдень відповідає майстер, увечері й уночі бот."],
  autopilot: ["Автопілот", "Бот відповідає завжди; складне передає майстру."],
};
const CALENDARS = {
  internal: ["Внутрішній календар", "Бот веде розклад сам, майстер бачить записи в Owner Bot."],
  google: ["Google Календар", "Зайнятість і нові записи в календарях майстрів."],
  lead_capture: ["Заявки без календаря", "Бот збирає заявку, час підтверджує майстер."],
};
const PRICE_TYPES = { fixed: "Фіксована", from: "Від …", range: "Діапазон", on_request: "За консультацією" };
const CHANNELS = { telegram_business: "Telegram", instagram: "Instagram", telegram_demo: "Демо-бот" };
const TABS = [
  ["overview", "Огляд"], ["basics", "Основне"], ["profile", "Профіль"], ["hours", "Графік"],
  ["services", "Послуги"], ["staff", "Майстри"], ["rules", "Правила"], ["faq", "FAQ і тон"],
  ["test", "Тест"], ["update", "AI-оновлення"], ["history", "Історія"], ["json", "JSON"],
];
const NEW_TABS = new Set(["basics", "profile", "hours", "services", "staff", "rules", "faq", "json"]);
const LEAD_STATUS = { new: "Нова", contacted: "На звʼязку", won: "Клієнт", lost: "Відмова" };
const LEAD_SERVICES = {
  ai_admin: "AI-адміністратор", voice: "AI для дзвінків", crm: "CRM", website: "Сайт",
  integration: "Інтеграція", other: "Інше",
};
const TEST_PROMPTS = [
  "Добрий вечір! Скільки коштує манікюр?",
  "Є вільне віконце на завтра після 15:00?",
  "Запишіть мене, будь ласка, на найближчий вільний час",
  "Де ви знаходитесь?",
  "Ви бот?",
  "Хочу перенести свій запис",
  "Можна скасувати запис?",
  "Скільки буде коштувати ось такий дизайн?",
  "Здравствуйте, можно на завтра?",
];
const LABELS = {
  price_min: "ціна", price_max: "ціна до", duration_min: "тривалість", buffer_min: "буфер",
  name: "назва", aliases: "синоніми", description: "опис", prepayment_amount: "передоплата",
  services: "Послуги", staff: "Майстри", hours: "Графік", owner_hours: "Години майстра",
  profile: "Профіль", address: "адреса", phone: "телефон", faq: "FAQ", tone: "Тон",
  prepayment: "Передоплата", cancellation: "Скасування", booking: "Запис", limits: "Ліміти",
  exceptions: "Винятки", breaks: "Перерви", internal_notes: "Внутрішні нотатки",
};

// --- helpers ---------------------------------------------------------------------------------

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  let value;
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "value") value = v;
    else if (k === "checked") el.checked = !!v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : String(kid));
  }
  if (value !== undefined) el.value = value;
  return el;
}

async function api(method, path, body) {
  // The public demo (sites/admin-demo) answers from sample data in the browser.
  if (window.demoApi) return window.demoApi(method, path, body === undefined ? undefined : clone(body));
  const headers = { "X-Admin-Request": "1" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch("/admin/api" + path, {
    method, headers, credentials: "same-origin",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) {
    S.me = null;
    renderLogin();
    throw new Error("Потрібно увійти");
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const detail = data && data.detail;
    throw new Error(typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : res.statusText);
  }
  return data;
}

function toast(text, bad) {
  const el = h("div", { class: "toast" + (bad ? " bad" : "") }, text);
  document.getElementById("toasts").append(el);
  setTimeout(() => el.remove(), bad ? 6000 : 3000);
}

function fail(err) {
  if (err && err.message !== "Потрібно увійти") toast(err.message || String(err), true);
}

function modal(title, body, actions) {
  const back = h("div", { class: "modal-back" });
  const close = () => back.remove();
  back.addEventListener("click", (e) => { if (e.target === back) close(); });
  back.append(h("div", { class: "modal", role: "dialog", "aria-modal": "true" },
    h("h2", null, title), body,
    h("div", { class: "modal-actions" },
      (actions || []).map(([label, cls, fn]) => h("button", {
        class: "btn " + (cls || ""), onclick: () => (fn ? fn(close) : close()),
      }, label)),
      !actions || !actions.length ? h("button", { class: "btn", onclick: close }, "Закрити") : null)));
  document.body.append(back);
  return close;
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast("Скопійовано"); }
  catch { toast("Не вдалося скопіювати, виділіть вручну", true); }
}

function copyBox(text) {
  return h("div", { class: "copy-box" }, h("code", { title: text }, text),
    h("button", { class: "btn small", onclick: () => copy(text) }, "Копіювати"));
}

async function busy(button, fn) {
  const label = button.textContent;
  button.disabled = true;
  button.replaceChildren(h("span", { class: "spinner" }), " ", label);
  try { return await fn(); }
  finally { button.disabled = false; button.textContent = label; }
}

const clone = (v) => JSON.parse(JSON.stringify(v));
const get = (obj, path) => path.reduce((o, k) => (o == null ? undefined : o[k]), obj);
function set(obj, path, value) {
  let o = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (o[path[i]] == null) o[path[i]] = typeof path[i + 1] === "number" ? [] : {};
    o = o[path[i]];
  }
  if (value === undefined) delete o[path[path.length - 1]];
  else o[path[path.length - 1]] = value;
}

const TRANSLIT = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ye", ж: "zh", з: "z", и: "y",
  і: "i", ї: "yi", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s",
  т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "", ю: "yu",
  я: "ya", ё: "yo", ы: "y", э: "e", ъ: "",
};
function makeId(text, fallback) {
  const latin = [...(text || "").toLowerCase()].map((c) => TRANSLIT[c] ?? c).join("");
  const id = latin.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
  return id.length >= 2 ? id : fallback;
}
function uniqueId(base, taken) {
  let id = base, n = 2;
  while (taken.includes(id)) id = `${base}_${n++}`;
  return id;
}

const fmtDate = (iso) => new Date(iso).toLocaleString("uk-UA", { dateStyle: "short", timeStyle: "short" });
const short = (v) => {
  if (v === undefined || v === null || v === "") return "—";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 90 ? s.slice(0, 88) + "…" : s;
};
const pathLabel = (path) => path.replace(/\[([^\]]+)\]/g, " › $1").split(".")
  .map((part) => part.split(" › ").map((p) => LABELS[p] || p).join(" › ")).join(" › ");

// --- config shape ----------------------------------------------------------------------------

function hm(t) { return typeof t === "string" ? t.slice(0, 5) : t; }
function normRanges(list) { return (list || []).map((r) => ({ start: hm(r.start), end: hm(r.end) })); }
function normWeek(week) {
  const out = {};
  for (const [d] of DAYS) out[d] = normRanges(week && week[d]);
  return out;
}

function normalize(input) {
  const c = clone(input || {});
  c.allowed_languages = c.allowed_languages || ["uk"];
  c.profile = c.profile || {};
  c.profile.payment_methods = c.profile.payment_methods || [];
  c.profile.extra_info = c.profile.extra_info || [];
  c.hours = normWeek(c.hours);
  if (c.owner_hours) c.owner_hours = normWeek(c.owner_hours);
  c.breaks = normRanges(c.breaks);
  c.exceptions = (c.exceptions || []).map((e) => ({ ...e, hours: e.hours ? normRanges(e.hours) : undefined }));
  c.services = (c.services || []).map((s) => {
    const out = { aliases: [], ...s };
    if (out.price_type === "fixed") delete out.price_max; // the server fills it from price_min
    return out;
  });
  c.staff = (c.staff || []).map((m) => ({ services: [], ...m }));
  for (const key of ["prepayment", "cancellation", "booking", "limits", "handoff", "google"]) c[key] = c[key] || {};
  c.tone = c.tone || {};
  c.tone.examples = c.tone.examples || [];
  c.faq = c.faq || [];
  return c;
}

function cleanValue(v) {
  if (Array.isArray(v)) return v.map(cleanValue);
  if (v && typeof v === "object") {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      if (k.startsWith("_") || val === undefined || val === null || val === "") continue;
      if (typeof val === "number" && Number.isNaN(val)) continue;
      out[k] = cleanValue(val);
    }
    return out;
  }
  return typeof v === "string" ? v.trim() : v;
}
const clean = (config) => cleanValue(config);

function blankConfig() {
  const week = (from, to, sat) => Object.fromEntries(DAYS.map(([d]) => [d,
    d === "sun" ? [] : [{ start: from, end: d === "sat" ? sat : to }]]));
  return normalize({
    slug: "", name: "", city: "Київ", timezone: "Europe/Kyiv", currency: "UAH",
    default_language: "uk", allowed_languages: ["uk"], calendar_provider: "internal",
    initial_mode: "draft", _autoSlug: true,
    profile: { address: "", payment_methods: ["готівка", "картка"] },
    hours: week("10:00", "19:00", "17:00"),
    services: [{ id: "", name: "", aliases: [], price_type: "fixed", duration_min: 60, buffer_min: 10, _auto: true }],
    staff: [{ id: "master", name: "Майстер", services: [], _auto: true }],
    prepayment: { required: false, deadline_hours: 24, requisites_text: "" },
    cancellation: { free_cancel_hours: 24, late_policy_text: "" },
    tone: { notes: "Тепло, коротко, на «ви». Без зменшувально-пестливих слів.", examples: [] },
    booking: { min_lead_minutes: 120, horizon_days: 30, slot_step_minutes: 30, max_slots_returned: 6,
      max_active_bookings_per_client: 2, require_phone: true },
    limits: { replies_per_hour: 20, daily_token_budget: 300000 },
    handoff: { resume_hours: 12, holding_interval_hours: 12, owner_reminder_minutes: 30 },
    google: { all_day_events_block: true },
    disclosure_silence_days: 30, retention_days: 90,
  });
}

const ERROR_TEXT = [
  [/^Field required$/, () => "обовʼязкове поле"],
  [/^Input should be a valid URL/, () => "некоректне посилання (має починатися з https://)"],
  [/^Input should be greater than or equal to (\S+)/, (m) => `має бути не менше ${m[1]}`],
  [/^Input should be less than or equal to (\S+)/, (m) => `має бути не більше ${m[1]}`],
  [/^String should have at least (\d+) character/, (m) => `щонайменше ${m[1]} символ(и)`],
  [/^String should match pattern/, () => "лише латиниця, цифри і _"],
  [/^List should have at least 1 item/, () => "потрібен хоча б один пункт"],
  [/^Input should be a valid (integer|number)/, () => "потрібне число"],
  [/^Input should be a valid time/, () => "некоректний час"],
  [/^Input should be a valid date/, () => "некоректна дата"],
  [/^Extra inputs are not permitted/, () => "зайве поле (перевірте JSON)"],
];
function errorText(msg) {
  for (const [re, fn] of ERROR_TEXT) {
    const m = re.exec(msg || "");
    if (m) return fn(m);
  }
  return msg;
}
function locLabel(loc) {
  const parts = (loc || "").split(".");
  const c = S.cur && S.cur.config;
  if (!loc) return "загалом";
  if ((parts[0] === "services" || parts[0] === "staff") && /^\d+$/.test(parts[1] || "") && c) {
    const item = c[parts[0]][Number(parts[1])];
    const kind = parts[0] === "services" ? "Послуга" : "Майстер";
    const rest = parts.slice(2).map((p) => LABELS[p] || p).join(" › ");
    return `${kind} «${(item && (item.name || item.id)) || Number(parts[1]) + 1}»${rest ? " › " + rest : ""}`;
  }
  return parts.map((p) => LABELS[p] || p).join(" › ");
}

// Validation errors point to a tab; root-level errors are matched by their text.
function errorTab(err) {
  const loc = err.loc || "";
  const msg = (err.msg || "").toLowerCase();
  const first = loc.split(".")[0];
  const byLoc = {
    services: "services", staff: "staff", hours: "hours", owner_hours: "hours", breaks: "hours",
    exceptions: "hours", profile: "profile", prepayment: "rules", cancellation: "rules",
    booking: "rules", limits: "rules", handoff: "rules", google: "rules", faq: "faq", tone: "faq",
    internal_notes: "faq", retention_days: "rules", disclosure_silence_days: "rules",
  };
  if (byLoc[first]) return byLoc[first];
  if (/^service |price|services \[/.test(msg)) return "services";
  if (/staff|google calendar id/.test(msg)) return "staff";
  if (/prepayment/.test(msg)) return "rules";
  if (/exceptions|breaks|time range|overlap/.test(msg)) return "hours";
  return "basics";
}

// --- editor state ----------------------------------------------------------------------------

function isDirty() {
  return !!S.cur && (S.cur.isNew || JSON.stringify(clean(S.cur.config)) !== S.cur.saved);
}

function markDirty() { renderSavebar(); }

function renderSavebar() {
  let bar = document.getElementById("savebar");
  if (!S.cur || !isDirty()) { if (bar) bar.remove(); return; }
  if (!bar) {
    bar = h("div", { class: "savebar", id: "savebar" });
    document.body.append(bar);
  }
  bar.replaceChildren(
    h("div", { class: "grow" }, S.cur.isNew ? "Нова студія ще не збережена" : "Є незбережені зміни"),
    !S.cur.isNew && h("button", { class: "btn small", onclick: discard }, "Скасувати"),
    h("button", { class: "btn small primary", onclick: (e) => busy(e.currentTarget, save) },
      S.cur.isNew ? "Створити студію" : "Зберегти"),
  );
}

function discard() {
  S.cur.config = normalize(JSON.parse(S.cur.saved));
  S.cur.errors = [];
  renderStudioPage();
}

async function save() {
  const config = clean(S.cur.config);
  let check;
  try { check = await api("POST", "/validate", { config, slug: S.cur.isNew ? null : S.cur.slug }); }
  catch (err) { return fail(err); }
  if (!check.ok) {
    S.cur.errors = check.errors;
    renderStudioPage();
    toast("Є помилки в даних, дивіться список угорі", true);
    return;
  }
  S.cur.errors = [];
  const diff = check.diff || [];
  const body = S.cur.isNew
    ? h("p", null, `Студію «${config.name}» буде створено в режимі «${MODES[config.initial_mode || "draft"][0]}».`)
    : diff.length ? diffTable(diff) : h("p", { class: "muted" }, "Змін немає.");
  modal(S.cur.isNew ? "Створити студію?" : "Що зміниться", body, [
    ["Назад", "", null],
    [S.cur.isNew ? "Створити" : "Зберегти", "primary", async (close) => {
      try {
        const res = S.cur.isNew
          ? await api("POST", "/studios", { config })
          : await api("PUT", "/studios/" + S.cur.slug, { config });
        if (!res.ok) {
          S.cur.errors = res.errors;
          close();
          renderStudioPage();
          return;
        }
        close();
        toast(`Збережено, версія ${res.version}`);
        const wasNew = S.cur.isNew;
        S.cur = null;
        await loadStudios();
        location.hash = `#/studio/${res.slug}/${wasNew ? "overview" : S.tab}`;
        if (!wasNew) route();
      } catch (err) { fail(err); }
    }],
  ]);
}

function diffTable(diff) {
  return h("div", { class: "table-wrap" }, h("table", null,
    h("thead", null, h("tr", null, h("th", null, "Що"), h("th", null, "Було"), h("th", null, "Стане"))),
    h("tbody", null, diff.map((d) => h("tr", null,
      h("td", null, pathLabel(d.path)),
      h("td", { class: "diff-old" }, short(d.old)),
      h("td", { class: "diff-new" }, short(d.new)))))));
}

// --- form fields bound to S.cur.config ----------------------------------------------------------

function field(label, input, opts = {}) {
  return h("div", { class: "field" + (opts.wide ? " wide" : "") },
    h("label", null, label), input, opts.hint && h("div", { class: "hint" }, opts.hint));
}

function text(label, path, opts = {}) {
  const multi = opts.type === "textarea";
  const input = multi
    ? h("textarea", { rows: opts.rows || 3, placeholder: opts.placeholder || "" })
    : h("input", { type: opts.type || "text", placeholder: opts.placeholder || "", min: opts.min, max: opts.max, class: opts.mono ? "mono" : null });
  const value = get(S.cur.config, path);
  input.value = value ?? "";
  if (opts.readonly) input.readOnly = true;
  input.addEventListener("input", () => {
    let v = input.value;
    if (opts.type === "number") v = v === "" ? undefined : Number(v);
    set(S.cur.config, path, v === "" ? undefined : v);
    if (opts.onInput) opts.onInput(v);
    markDirty();
  });
  return field(label, input, opts);
}

const num = (label, path, opts = {}) => text(label, path, { ...opts, type: "number" });

function list(label, path, opts = {}) {
  // Comma separated (one line) or one item per line.
  const lines = opts.lines;
  const input = lines ? h("textarea", { rows: opts.rows || 3, placeholder: opts.placeholder || "" })
    : h("input", { type: "text", placeholder: opts.placeholder || "" });
  input.value = (get(S.cur.config, path) || []).join(lines ? "\n" : ", ");
  input.addEventListener("input", () => {
    const items = input.value.split(lines ? "\n" : ",").map((s) => s.trim()).filter(Boolean);
    set(S.cur.config, path, items);
    markDirty();
  });
  return field(label, input, { hint: opts.hint || (lines ? "Кожен пункт з нового рядка" : "Через кому"), wide: opts.wide });
}

function select(label, path, options, opts = {}) {
  const input = h("select", null, Object.entries(options).map(([v, l]) => h("option", { value: v }, l)));
  input.value = get(S.cur.config, path) ?? Object.keys(options)[0];
  input.addEventListener("change", () => {
    set(S.cur.config, path, input.value);
    if (opts.onChange) opts.onChange(input.value);
    markDirty();
  });
  return field(label, input, opts);
}

function checkbox(label, path, opts = {}) {
  const input = h("input", { type: "checkbox", checked: !!get(S.cur.config, path) });
  input.addEventListener("change", () => {
    set(S.cur.config, path, input.checked);
    if (opts.onChange) opts.onChange(input.checked);
    markDirty();
  });
  return h("label", { class: "check" + (opts.wide ? " wide" : "") }, input, label);
}

function optionCards(path, options, onChange) {
  const current = get(S.cur.config, path);
  return h("div", { class: "option-cards" }, Object.entries(options).map(([value, [title, desc]]) =>
    h("button", {
      type: "button", class: "option-card" + (current === value ? " on" : ""),
      onclick: () => { set(S.cur.config, path, value); markDirty(); onChange ? onChange(value) : renderTab(); },
    }, h("b", null, title), h("span", null, desc))));
}

// Element.append() would stringify arrays; h() flattens them.
const put = (el, ...kids) => el.append(h("div", null, ...kids));

function card(title, ...kids) {
  return h("section", { class: "card" }, title && h("h2", null, title), ...kids);
}

// --- boot and routing ------------------------------------------------------------------------

async function boot() {
  try {
    S.me = await api("GET", "/me");
  } catch { return; }
  document.getElementById("nav").hidden = false;
  const llm = S.me.llm;
  document.getElementById("topbar-right").replaceChildren(
    h("span", { class: "badge " + (llm.ready ? "ok" : "bad"), title: "Модель для відповідей бота" },
      llm.ready ? `Модель: ${llm.model || llm.provider}` : "Модель не налаштована"),
    window.demoApi
      ? h("span", { class: "badge warn", title: "Дані вигадані, зміни не зберігаються" }, "Демо")
      : h("form", { method: "post", action: "/admin/logout" },
        h("button", { class: "btn ghost small", type: "submit" }, "Вийти")));
  window.addEventListener("hashchange", guardedRoute);
  window.addEventListener("beforeunload", (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ""; } });
  if (!location.hash) location.hash = "#/studios";
  route();
}

function guardedRoute() {
  const leavingStudio = S.cur && !location.hash.startsWith(`#/studio/${S.cur.slug}/`) && !(S.cur.isNew && location.hash.startsWith("#/new/edit"));
  if (leavingStudio && isDirty() && !confirm("Є незбережені зміни. Вийти без збереження?")) {
    history.replaceState(null, "", S.lastHash);
    return;
  }
  route();
}

async function route() {
  S.lastHash = location.hash;
  const [page, slug, tab] = location.hash.replace(/^#\/?/, "").split("/");
  for (const a of document.querySelectorAll("[data-nav]")) {
    a.classList.toggle("active", a.dataset.nav === page || (page === "studio" && a.dataset.nav === "studios") || (page === "new" && a.dataset.nav === "studios"));
  }
  try {
    if (page === "studio" && slug) await openStudio(decodeURIComponent(slug), tab || "overview");
    else if (page === "new" && slug === "edit" && S.cur && S.cur.isNew) { S.tab = tab || "basics"; renderStudioPage(); }
    else if (page === "new") { S.cur = null; renderNew(); }
    else if (page === "leads") { S.cur = null; await renderLeads(); }
    else if (page === "system") { S.cur = null; await renderSystem(); }
    else { S.cur = null; await renderStudios(); }
  } catch (err) { fail(err); }
  renderSavebar();
}

function renderLogin() {
  document.getElementById("nav").hidden = true;
  document.getElementById("topbar-right").replaceChildren();
  $app.replaceChildren(h("div", { class: "card login-card", style: "margin: 4rem auto" },
    h("h1", null, "Вхід в адмінку"),
    h("p", null, "Надішліть ", h("code", null, "/admin"), " в Owner Bot: бот дасть одноразове посилання на 10 хвилин."),
    h("p", { class: "muted small" }, "Локально: ", h("code", null, "uv run python -m app.cli admin link"))));
}

// --- studios list ----------------------------------------------------------------------------

async function loadStudios() { S.studios = await api("GET", "/studios"); }

function launchSteps(row, detail) {
  const config = detail ? detail.config : null;
  const placeholders = config && JSON.stringify(config).includes("уточнити");
  const check = detail ? detail.last_check : row.last_check;
  const checkFresh = check && check.version === row.config_version;
  const clientChannel = row.channels.some((c) => c.kind !== "telegram_demo" && c.status === "active");
  return [
    { key: "data", done: !placeholders, warn: placeholders },
    { key: "check", done: checkFresh && !check.warn, warn: check && (!checkFresh || check.warn > 0) },
    { key: "master", done: row.members > 0 },
    { key: "channel", done: clientChannel || row.is_demo },
    { key: "mode", done: row.mode !== "draft" },
  ];
}

async function renderStudios() {
  await loadStudios();
  const head = h("div", { class: "page-head" },
    h("div", null, h("h1", null, "Студії"), h("p", null, "Усі клієнти, їхній стан і що потребує уваги.")),
    h("a", { class: "btn primary", href: "#/new" }, "+ Нова студія"));
  if (!S.studios.length) {
    $app.replaceChildren(head, h("div", { class: "card empty" },
      h("h2", null, "Ще немає жодної студії"),
      h("p", null, "Вставте текст від майстра, і AI заповнить дані за хвилину."),
      h("a", { class: "btn primary", href: "#/new" }, "Додати першу студію")));
    return;
  }
  $app.replaceChildren(head, h("div", { class: "grid" }, S.studios.map(studioCard)));
}

function studioCard(row) {
  const steps = launchSteps(row);
  const done = steps.filter((s) => s.done).length;
  const metric = (value, label, alert) => h("div", { class: "metric" + (alert ? " alert" : "") }, h("b", null, value), h("span", null, label));
  return h("a", { class: "card studio-card", href: `#/studio/${encodeURIComponent(row.slug)}/overview` },
    h("div", { class: "row" },
      h("div", { class: "grow" }, h("div", { class: "title" }, row.name), h("div", { class: "muted small mono" }, row.slug)),
      row.status === "paused" ? h("span", { class: "badge bad" }, "Пауза") : h("span", { class: "badge accent" }, MODES[row.mode][0])),
    h("div", { class: "metrics" },
      metric(row.waiting, "чекають", row.waiting > 0),
      metric(row.drafts, "чернетки", row.drafts > 0),
      metric(row.bookings_today, "записи сьогодні"),
      metric(Math.round(row.tokens_today / 1000) + "k", "токени")),
    h("div", { class: "row small" },
      row.is_demo && h("span", { class: "badge" }, "Демо"),
      row.channels.filter((c) => c.kind !== "telegram_demo").map(channelBadge),
      !row.channels.some((c) => c.kind !== "telegram_demo") && !row.is_demo && h("span", { class: "badge warn" }, "Канал не підключено")),
    h("div", null,
      h("div", { class: "row small muted", style: "justify-content: space-between; margin-bottom: .3rem" },
        h("span", null, "Запуск"), h("span", null, `${done} з ${steps.length}`)),
      h("div", { class: "progress" }, h("i", { style: `width: ${(done / steps.length) * 100}%` }))));
}

function channelBadge(c) {
  let cls = c.status === "active" ? "ok" : "bad";
  let label = CHANNELS[c.kind] || c.kind;
  if (c.username) label += " @" + c.username;
  if (c.token_expires_at) {
    const days = Math.floor((new Date(c.token_expires_at) - Date.now()) / 86400000);
    if (days < 10) { cls = "warn"; label += ` · токен ${days} дн.`; }
  }
  return h("span", { class: "badge " + cls }, label);
}

// --- new studio ------------------------------------------------------------------------------

function renderNew() {
  const textarea = h("textarea", { rows: 12, placeholder: "Вставте все, що є: відповіді на анкету, прайс, графік, адресу, опис з Instagram, правила передоплати. Можна безладно і з помилками." });
  const out = h("div");
  const startEditor = (config, banner) => {
    S.cur = { isNew: true, slug: "", config: normalize(config), saved: "", errors: [], banner };
    location.hash = "#/new/edit/basics";
  };
  $app.replaceChildren(
    h("div", { class: "page-head" }, h("div", null, h("h1", null, "Нова студія"),
      h("p", null, "Найшвидше: вставити текст від майстра. AI заповнить форму, ви перевірите й збережете."))),
    card("1. Заповнити з тексту (AI)",
      textarea,
      h("div", { class: "row", style: "margin-top: .75rem" },
        h("button", { class: "btn primary", onclick: (e) => busy(e.currentTarget, async () => {
          if (textarea.value.trim().length < 20) return toast("Додайте більше тексту", true);
          try {
            const res = await api("POST", "/import", { text: textarea.value });
            if (!res.config) {
              out.replaceChildren(h("div", { class: "banner bad" }, res.errors.map((e) => e.msg).join("; ")));
              return;
            }
            startEditor({ ...res.config, _autoSlug: !res.config.slug },
              { questions: res.questions, warnings: res.warnings, errors: res.errors });
          } catch (err) { fail(err); }
        }) }, "Заповнити"),
        h("span", { class: "muted small" }, "Займає 20–60 секунд. Нічого не зберігається без вашого підтвердження.")),
      out),
    card("2. Інші способи",
      h("div", { class: "row" },
        h("button", { class: "btn", onclick: () => startEditor(blankConfig()) }, "Порожній шаблон"),
        S.me.demo_slug && h("button", { class: "btn", onclick: async () => {
          try {
            const demo = await api("GET", "/studios/" + S.me.demo_slug);
            const config = { ...demo.config, slug: "", name: "", initial_mode: "draft", internal_notes: undefined, _autoSlug: true };
            startEditor(config);
          } catch (err) { fail(err); }
        } }, "Копія демо-студії"))));
}

// --- studio page -----------------------------------------------------------------------------

async function openStudio(slug, tab) {
  if (!S.cur || S.cur.slug !== slug || S.cur.isNew) {
    const detail = await api("GET", "/studios/" + encodeURIComponent(slug));
    if (!S.studios.length) await loadStudios();
    S.cur = { slug, isNew: false, detail, config: normalize(detail.config), saved: JSON.stringify(clean(normalize(detail.config))), errors: [] };
  }
  S.tab = TABS.some(([k]) => k === tab) ? tab : "overview";
  renderStudioPage();
}

async function refreshDetail() {
  S.cur.detail = await api("GET", "/studios/" + encodeURIComponent(S.cur.slug));
  await loadStudios();
}

function currentRow() {
  return S.studios.find((r) => r.slug === S.cur.slug);
}

function renderStudioPage() {
  const cur = S.cur;
  const row = cur.isNew ? null : currentRow();
  const tabs = TABS.filter(([k]) => !cur.isNew || NEW_TABS.has(k));
  if (!tabs.some(([k]) => k === S.tab)) S.tab = tabs[0][0];
  const errorTabs = new Set((cur.errors || []).map(errorTab));
  const base = cur.isNew ? "#/new/edit/" : `#/studio/${encodeURIComponent(cur.slug)}/`;

  const head = h("div", { class: "studio-head" },
    h("div", null,
      h("h1", null, cur.config.name || (cur.isNew ? "Нова студія" : cur.slug)),
      h("div", { class: "meta" },
        !cur.isNew && h("span", { class: "badge mono" }, cur.slug),
        row && h("span", { class: "badge accent" }, MODES[row.mode][0]),
        row && row.status === "paused" && h("span", { class: "badge bad" }, "Пауза"),
        row && h("span", { class: "badge" }, `версія ${row.config_version}`),
        row && row.channels.filter((c) => c.kind !== "telegram_demo").map(channelBadge))),
    h("a", { class: "btn ghost", href: "#/studios" }, "← Усі студії"));

  const tabBar = h("div", { class: "tabs", role: "tablist" }, tabs.map(([k, label]) =>
    h("button", { class: S.tab === k ? "on" : "", role: "tab", onclick: () => { location.hash = base + k; } },
      label, errorTabs.has(k) && h("span", { class: "dot", title: "Є помилки" }))));

  const banners = [];
  if (cur.errors && cur.errors.length) {
    banners.push(h("div", { class: "banner bad" }, h("b", null, "Дані не пройшли перевірку:"),
      h("ul", null, cur.errors.map((e) => h("li", null,
        h("button", { class: "linkish", onclick: () => { location.hash = base + errorTab(e); } }, locLabel(e.loc)),
        ": ", errorText(e.msg))))));
  }
  if (cur.banner) {
    const b = cur.banner;
    if (b.warnings && b.warnings.length) banners.push(h("div", { class: "banner warn" }, h("b", null, "Перевірте суми, їх немає в тексті:"), h("ul", null, b.warnings.map((w) => h("li", null, w)))));
    if (b.questions && b.questions.length) banners.push(h("div", { class: "banner info" }, h("b", null, "AI не знайшов у тексті, уточніть у майстра:"), h("ul", null, b.questions.map((q) => h("li", null, q))),
      h("button", { class: "btn small", style: "margin-top: .5rem", onclick: () => copy("Кілька уточнень для налаштування бота:\n" + b.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")) }, "Скопіювати питання для майстра")));
    if (b.errors && b.errors.length && !(cur.errors && cur.errors.length)) banners.push(h("div", { class: "banner bad" }, h("b", null, "Потрібно виправити перед збереженням:"), h("ul", null, b.errors.map((e) => h("li", null, `${locLabel(e.loc)}: ${errorText(e.msg)}`)))));
  }

  $app.replaceChildren(head, tabBar, ...banners, h("div", { id: "tab" }));
  renderTab();
}

function renderTab() {
  const el = document.getElementById("tab");
  if (!el) return;
  const renderers = {
    overview: tabOverview, basics: tabBasics, profile: tabProfile, hours: tabHours, services: tabServices,
    staff: tabStaff, rules: tabRules, faq: tabFaq, test: tabTest, update: tabUpdate, history: tabHistory, json: tabJson,
  };
  el.replaceChildren();
  Promise.resolve(renderers[S.tab](el)).catch(fail);
  renderSavebar();
}

// --- tab: overview -----------------------------------------------------------------------------

async function tabOverview(el) {
  const cur = S.cur;
  const row = currentRow();
  const detail = cur.detail;
  const steps = Object.fromEntries(launchSteps(row, detail).map((s) => [s.key, s]));
  const mark = (s, n) => h("div", { class: "mark" + (s.done ? " done" : s.warn ? " warn" : "") }, s.done ? "✓" : s.warn ? "!" : n);
  const linkOut = h("div");
  const igOut = h("div");
  const bot = S.me.bot_username ? "@" + S.me.bot_username : "Owner Bot";
  const check = detail.last_check;

  const runtime = card("Робота бота",
    h("div", { class: "segmented", style: "margin-bottom: .6rem" }, Object.entries(MODES).map(([k, [label]]) =>
      h("button", { class: row.mode === k ? "on" : "", onclick: () => setRuntime({ mode: k }) }, label))),
    h("p", { class: "muted small" }, MODES[row.mode][1]),
    h("div", { class: "row" },
      row.status === "paused"
        ? h("button", { class: "btn primary", onclick: () => setRuntime({ status: "active" }) }, "Увімкнути бота")
        : h("button", { class: "btn danger", onclick: () => setRuntime({ status: "paused" }) }, "Пауза: бот мовчить"),
      h("span", { class: "muted small" }, "Майстер може те саме командами /mode, /pause, /resume.")));

  const checklist = card("Запуск студії",
    h("ol", { class: "checklist" },
      h("li", null, mark(steps.data, 1), h("div", { class: "body" },
        h("b", null, "Дані студії"),
        h("p", null, steps.data.warn ? "У даних є «уточнити»: заповніть, перш ніж вмикати бота." : "Ціни, графік, адреса, правила. Бот знає лише те, що тут."),
        h("a", { class: "btn small", href: `#/studio/${cur.slug}/services` }, "Перевірити дані"))),
      h("li", null, mark(steps.check, 2), h("div", { class: "body" },
        h("b", null, "Автоперевірка"),
        h("p", null, check ? `Остання: ${fmtDate(check.at)}, версія ${check.version}. Добре ${check.ok}, перевірити ${check.check}, проблеми ${check.warn}.` + (check.version !== row.config_version ? " Дані змінилися після перевірки." : "")
          : "10 типових і каверзних питань клієнток з відповідями бота на даних цієї студії."),
        h("a", { class: "btn small", href: `#/studio/${cur.slug}/test` }, check ? "Перевірити знову" : "Запустити"))),
      h("li", null, mark(steps.master, 3), h("div", { class: "body" },
        h("b", null, "Майстер у Owner Bot"),
        h("p", null, row.members ? `Підключено людей: ${row.members}. Їм приходять сповіщення й чернетки.` : "Одноразове посилання на 3 дні. Майстер відкриває його і натискає «Почати»."),
        h("div", { class: "row" },
          h("button", { class: "btn small", onclick: (e) => busy(e.currentTarget, () => ownerLink("owner", linkOut)) }, "Посилання для майстра"),
          h("button", { class: "btn small ghost", onclick: (e) => busy(e.currentTarget, () => ownerLink("admin", linkOut)) }, "Для адміністратора студії")),
        linkOut)),
      h("li", null, mark(steps.channel, 4), h("div", { class: "body" },
        h("b", null, "Канал клієнток"),
        h("p", null, "Telegram: майстер відкриває Налаштування → Telegram для бізнесу → Чат-боти, додає " + bot + ", обирає «Усі чати, крім…» і виключає особисті. Привітання й автовідповіді Telegram вимкнути."),
        h("div", { class: "row" },
          h("button", { class: "btn small", onclick: () => copy(masterTelegramGuide(bot)) }, "Скопіювати інструкцію для майстра"),
          S.me.instagram_ready && h("button", { class: "btn small", onclick: (e) => busy(e.currentTarget, async () => {
            try {
              const res = await api("POST", `/studios/${cur.slug}/instagram-link`);
              igOut.replaceChildren(h("p", { class: "small muted", style: "margin-top: .5rem" }, "Майстер відкриває посилання й дозволяє доступ (діє 3 дні):"), copyBox(res.url));
            } catch (err) { fail(err); }
          }) }, "Підключити Instagram")),
        igOut)),
      h("li", null, mark(steps.mode, 5), h("div", { class: "body" },
        h("b", null, "Режим роботи"),
        h("p", null, "Перші 3–7 днів чернетки: майстер бачить кожну відповідь і погоджує кнопкою. Коли правок майже немає, переводьте на «Поза годинами» або «Автопілот».")))));

  const statsOut = h("pre", { class: "small" }, "Завантаження…");
  const stats = card(null,
    h("div", { class: "card-head" }, h("h2", null, "Статистика"),
      h("div", { class: "segmented" }, [7, 30, 90].map((d) => h("button", {
        class: d === 30 ? "on" : "",
        onclick: (e) => {
          for (const b of e.currentTarget.parentNode.children) b.classList.toggle("on", b === e.currentTarget);
          loadStats(d, statsOut);
        },
      }, `${d} дн.`)))),
    statsOut);

  const knows = card("Що знає бот",
    h("p", { class: "muted small" }, "Саме ці дані бачить модель. Внутрішніх нотаток тут немає."),
    h("details", null, h("summary", null, "Показати"), h("pre", { class: "small", style: "margin-top: .5rem" }, JSON.stringify(detail.public_data, null, 2))));

  el.append(h("div", { class: "stack" }, checklist, runtime, stats, knows));
  loadStats(30, statsOut);
}

function masterTelegramGuide(bot) {
  return [
    "Як підключити AI-адміністратора до Telegram:",
    "1. Telegram → Налаштування → Telegram для бізнесу → Чат-боти.",
    `2. Вставте ${bot} і натисніть «Додати».`,
    "3. Доступ до чатів: «Усі чати, крім…» і додайте у винятки особисті чати (родина, друзі).",
    "4. Дозвольте боту відповідати на повідомлення.",
    "5. Вимкніть у Telegram для бізнесу «Привітання» та «Немає на місці», щоб не було двох відповідей.",
    "Будь-якої миті можна зупинити бота: /pause у боті або кнопка паузи в самому чаті.",
  ].join("\n");
}

async function loadStats(days, out) {
  try { out.textContent = (await api("GET", `/studios/${S.cur.slug}/stats?days=${days}`)).text; }
  catch (err) { out.textContent = err.message; }
}

async function setRuntime(body) {
  try {
    await api("POST", `/studios/${S.cur.slug}/runtime`, body);
    await refreshDetail();
    toast(body.status === "paused" ? "Бот на паузі" : "Збережено");
    renderStudioPage();
  } catch (err) { fail(err); }
}

async function ownerLink(role, out) {
  try {
    const res = await api("POST", `/studios/${S.cur.slug}/owner-link`, { role });
    const name = S.cur.config.name;
    const message = res.url
      ? `Вітаємо! Ось посилання, щоб підключити AI-адміністратора студії «${name}». Відкрийте його і натисніть «Почати» (діє 3 дні):\n${res.url}`
      : null;
    out.replaceChildren(
      res.url ? copyBox(res.url) : h("p", { class: "small" }, "Задайте OWNER_BOT_TOKEN, щоб отримати посилання. Токен: ", h("code", null, res.token)),
      message && h("button", { class: "btn small ghost", style: "margin-top: .4rem", onclick: () => copy(message) }, "Скопіювати повідомлення для майстра"));
  } catch (err) { fail(err); }
}

// --- tab: basics -------------------------------------------------------------------------------

function tabBasics(el) {
  const c = S.cur.config;
  const isNew = S.cur.isNew;
  const slugField = text("Slug (латиницею, назавжди)", ["slug"], {
    mono: true, readonly: !isNew, placeholder: "studio_name",
    hint: isNew ? "Внутрішній ідентифікатор. Генерується з назви." : "Не змінюється після створення.",
    onInput: () => { c._autoSlug = false; },
  });
  const nameField = text("Назва студії", ["name"], {
    placeholder: "Nail Studio Olena",
    onInput: (v) => {
      if (isNew && c._autoSlug !== false) {
        c.slug = makeId(v, "");
        slugField.querySelector("input").value = c.slug;
      }
      const title = document.querySelector(".studio-head h1");
      if (title) title.textContent = v || "Нова студія";
    },
  });
  const langs = h("div", { class: "choices" }, Object.entries(LANGS).map(([code, label]) => {
    const input = h("input", { type: "checkbox", checked: c.allowed_languages.includes(code) });
    input.addEventListener("change", () => {
      c.allowed_languages = Object.keys(LANGS).filter((k) => (k === code ? input.checked : c.allowed_languages.includes(k)));
      if (!c.allowed_languages.includes(c.default_language)) c.default_language = c.allowed_languages[0] || "uk";
      markDirty();
      renderTab();
    });
    return h("label", { class: "check" }, input, label);
  }));
  el.append(h("div", { class: "stack" },
    card("Студія", h("div", { class: "form-grid" },
      nameField, slugField,
      text("Місто", ["city"]),
      select("Часовий пояс", ["timezone"], { "Europe/Kyiv": "Київ", "Europe/Warsaw": "Варшава", "Europe/Berlin": "Берлін", "Europe/Prague": "Прага", "Europe/Dublin": "Дублін", "Europe/London": "Лондон" }),
      select("Валюта", ["currency"], { UAH: "грн (UAH)", EUR: "EUR", PLN: "PLN", USD: "USD" }))),
    card("Мови",
      h("p", { class: "muted small" }, "Бот вітається мовою за замовчуванням і переходить на мову клієнтки, якщо вона дозволена."),
      langs,
      h("div", { class: "form-grid", style: "margin-top: .8rem" },
        select("Мова за замовчуванням", ["default_language"], Object.fromEntries(c.allowed_languages.map((k) => [k, LANGS[k]]))))),
    card("Календар", h("p", { class: "muted small" }, "Звідки бот бере вільний час і куди записує."),
      optionCards(["calendar_provider"], CALENDARS)),
    isNew
      ? card("Режим на старті", optionCards(["initial_mode"], MODES))
      : card("Режим", h("p", { class: "muted" }, "Поточний режим змінюється на вкладці «Огляд», бот підхоплює одразу."))));
}

// --- tab: profile ------------------------------------------------------------------------------

function tabProfile(el) {
  const p = ["profile"];
  el.append(h("div", { class: "stack" },
    card("Як знайти", h("div", { class: "form-grid" },
      text("Адреса", [...p, "address"], { wide: true, placeholder: "вул. Хрещатик, 1, Київ" }),
      text("Як дійти", [...p, "how_to_find"], { type: "textarea", wide: true, placeholder: "Вхід з двору, 2 поверх" }),
      text("Посилання на карту", [...p, "map_url"], { type: "url", placeholder: "https://maps.app.goo.gl/..." }),
      text("Телефон", [...p, "phone"], { placeholder: "+380..." }))),
    card("Посилання", h("div", { class: "form-grid" },
      text("Instagram", [...p, "instagram_url"], { type: "url" }),
      text("Портфоліо", [...p, "portfolio_url"], { type: "url" }),
      text("Повідомлення про дані (privacy)", [...p, "privacy_url"], { type: "url", hint: "Бот дає це посилання, коли просить телефон." }))),
    card("Інше", h("div", { class: "form-grid" },
      list("Способи оплати", [...p, "payment_methods"], { placeholder: "готівка, картка" }),
      text("Вікові обмеження", [...p, "age_policy"], { placeholder: "Тату тільки з 18 років" }),
      list("Додаткова інформація для клієнток", [...p, "extra_info"], { lines: true, wide: true, rows: 4, placeholder: "Під час тривоги переходимо в укриття поруч" })))));
}

// --- tab: hours --------------------------------------------------------------------------------

function rangesEditor(path, emptyLabel) {
  const ranges = get(S.cur.config, path) || [];
  const wrap = h("div", { class: "ranges" });
  ranges.forEach((r, i) => {
    const time = (key) => {
      const input = h("input", { type: "time", value: r[key] });
      input.addEventListener("change", () => { r[key] = input.value; markDirty(); });
      return input;
    };
    wrap.append(h("span", { class: "range" }, time("start"), "–", time("end"),
      h("button", { class: "icon-btn", title: "Прибрати", onclick: () => { ranges.splice(i, 1); markDirty(); renderTab(); } }, "✕")));
  });
  if (!ranges.length) wrap.append(h("span", { class: "closed-label" }, emptyLabel));
  wrap.append(h("button", { class: "btn small ghost", onclick: () => {
    const last = ranges[ranges.length - 1];
    ranges.push(last ? { start: last.end, end: last.end < "20:00" ? "20:00" : "23:00" } : { start: "10:00", end: "19:00" });
    set(S.cur.config, path, ranges);
    markDirty();
    renderTab();
  } }, "+ години"));
  return wrap;
}

function weekEditor(key) {
  return h("div", { class: "hours" }, DAYS.map(([d, label]) =>
    h("div", { class: "hours-row" }, h("div", { class: "day" }, label), rangesEditor([key, d], "Вихідний"))));
}

function copyMonday(key) {
  const week = S.cur.config[key];
  for (const [d] of DAYS.slice(1, 5)) week[d] = clone(week.mon);
  markDirty();
  renderTab();
}

function tabHours(el) {
  const c = S.cur.config;
  const sameOwner = !c.owner_hours;
  const ownerToggle = h("input", { type: "checkbox", checked: sameOwner });
  ownerToggle.addEventListener("change", () => {
    if (ownerToggle.checked) delete c.owner_hours;
    else c.owner_hours = clone(c.hours);
    markDirty();
    renderTab();
  });
  const exceptions = c.exceptions;
  el.append(h("div", { class: "stack" },
    card(null, h("div", { class: "card-head" }, h("h2", null, "Робочі години"),
      h("button", { class: "btn small ghost", onclick: () => copyMonday("hours") }, "Понеділок → усі будні")),
      h("p", { class: "muted small" }, "У ці години бот пропонує вільні вікна. Кілька проміжків на день, якщо є перерва."),
      weekEditor("hours")),
    card("Години на звʼязку майстра",
      h("p", { class: "muted small" }, "Для режиму «Поза годинами», тихих сповіщень і чесного «майстер відповість сьогодні до 20:00»."),
      h("label", { class: "check" }, ownerToggle, "Збігаються з робочими годинами"),
      !sameOwner && h("div", { style: "margin-top: .75rem" }, weekEditor("owner_hours"))),
    card("Щоденні перерви", h("p", { class: "muted small" }, "Наприклад обід. У цей час записів немає."),
      rangesEditor(["breaks"], "Без перерв")),
    card(null, h("div", { class: "card-head" }, h("h2", null, "Вихідні й особливі дні"),
      h("button", { class: "btn small", onclick: () => {
        exceptions.push({ date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), closed: true, note: "" });
        markDirty();
        renderTab();
      } }, "+ дата")),
      h("p", { class: "muted small" }, "Свята, відпустка, скорочені дні. Для разових відключень майстер може написати /close в Owner Bot."),
      exceptions.length ? exceptions.map((ex, i) => {
        const date = h("input", { type: "date", value: ex.date });
        date.addEventListener("change", () => { ex.date = date.value; markDirty(); });
        const closed = h("input", { type: "checkbox", checked: !!ex.closed });
        closed.addEventListener("change", () => {
          ex.closed = closed.checked;
          ex.hours = closed.checked ? undefined : [{ start: "10:00", end: "15:00" }];
          markDirty();
          renderTab();
        });
        const note = h("input", { type: "text", value: ex.note || "", placeholder: "Причина, бот її не озвучує" });
        note.addEventListener("input", () => { ex.note = note.value; markDirty(); });
        return h("div", { class: "item" },
          h("div", { class: "row" }, h("div", { style: "width: 170px" }, date),
            h("label", { class: "check" }, closed, "Вихідний"),
            h("div", { class: "grow" }, note),
            h("button", { class: "icon-btn", title: "Видалити", onclick: () => { exceptions.splice(i, 1); markDirty(); renderTab(); } }, "✕")),
          !ex.closed && h("div", { style: "margin-top: .6rem" }, rangesEditor(["exceptions", i, "hours"], "")));
      }) : h("p", { class: "muted" }, "Немає."))));
}

// --- tab: services -----------------------------------------------------------------------------

function priceSummary(s) {
  const cur = S.cur.config.currency === "UAH" ? "грн" : S.cur.config.currency;
  if (s.price_type === "on_request") return "за консультацією";
  if (s.price_type === "from") return s.price_min != null ? `від ${s.price_min} ${cur}` : "";
  if (s.price_type === "range") return s.price_min != null ? `${s.price_min}–${s.price_max ?? "?"} ${cur}` : "";
  return s.price_min != null ? `${s.price_min} ${cur}` : "";
}

function renameRefs(oldId, newId) {
  for (const m of S.cur.config.staff) m.services = m.services.map((id) => (id === oldId ? newId : id));
}

function moveItem(arr, i, delta) {
  const j = i + delta;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  markDirty();
  renderTab();
}

function tabServices(el) {
  const c = S.cur.config;
  const services = c.services;
  const addService = (template) => {
    const s = template ? { ...clone(template), _auto: false } : { id: "", name: "", aliases: [], price_type: "fixed", duration_min: 60, buffer_min: 10, _auto: true };
    if (template) { s.id = uniqueId(template.id + "_copy", services.map((x) => x.id)); s.name = template.name + " (копія)"; }
    services.push(s);
    if (c.staff.length === 1 && s.id) c.staff[0].services.push(s.id);
    markDirty();
    renderTab();
  };
  put(el,
    h("p", { class: "muted" }, "Назва, ціна і тривалість. Синоніми допомагають боту зрозуміти «шелак» чи «гель-лак». Комбо-послугу додайте окремою послугою."),
    services.map((s, i) => serviceItem(s, i)),
    h("div", { class: "add-row" }, h("button", { class: "btn", onclick: () => addService() }, "+ Послуга")));
}

function serviceItem(s, i) {
  const c = S.cur.config;
  const services = c.services;
  const title = h("div", { class: "grow" }, s.name || "Нова послуга", h("span", { class: "muted small" }, "  " + priceSummary(s)));
  let prevId = s.id; // staff refer to services by id, so a rename updates them too
  const idField = text("ID", ["services", i, "id"], {
    mono: true, hint: "Латиницею, генерується з назви",
    onInput: (v) => { renameRefs(prevId, v); prevId = v; s._auto = false; },
  });
  const nameField = text("Назва", ["services", i, "name"], {
    placeholder: "Манікюр з гель-лаком",
    onInput: (v) => {
      title.firstChild.textContent = v || "Нова послуга";
      if (s._auto) {
        s.id = uniqueId(makeId(v, ""), services.filter((x) => x !== s).map((x) => x.id));
        if (prevId) renameRefs(prevId, s.id);
        else if (c.staff.length === 1 && s.id && !c.staff[0].services.includes(s.id)) c.staff[0].services.push(s.id);
        prevId = s.id;
        idField.querySelector("input").value = s.id;
      }
    },
  });
  const priceFields = [];
  if (s.price_type !== "on_request") priceFields.push(num(s.price_type === "range" ? "Ціна від" : s.price_type === "from" ? "Ціна від" : "Ціна", ["services", i, "price_min"], { min: 0 }));
  if (s.price_type === "range") priceFields.push(num("Ціна до", ["services", i, "price_max"], { min: 0 }));
  return h("div", { class: "item" },
    h("div", { class: "item-head" }, title,
      h("button", { class: "icon-btn", title: "Вгору", onclick: () => moveItem(services, i, -1) }, "↑"),
      h("button", { class: "icon-btn", title: "Вниз", onclick: () => moveItem(services, i, 1) }, "↓"),
      h("button", { class: "icon-btn", title: "Дублювати", onclick: () => {
        const copyItem = { ...clone(s), _auto: false };
        copyItem.id = uniqueId(s.id + "_2", services.map((x) => x.id));
        copyItem.name = s.name + " (копія)";
        services.splice(i + 1, 0, copyItem);
        for (const m of c.staff) if (m.services.includes(s.id)) m.services.push(copyItem.id);
        markDirty();
        renderTab();
      } }, "⧉"),
      h("button", { class: "icon-btn", title: "Видалити", onclick: () => {
        if (!confirm(`Видалити «${s.name || "послугу"}»?`)) return;
        services.splice(i, 1);
        for (const m of c.staff) m.services = m.services.filter((id) => id !== s.id);
        markDirty();
        renderTab();
      } }, "✕")),
    h("div", { class: "form-grid" },
      nameField, idField,
      select("Тип ціни", ["services", i, "price_type"], PRICE_TYPES, {
        onChange: (v) => {
          if (v === "on_request") { delete s.price_min; delete s.price_max; }
          if (v === "from" || v === "fixed") delete s.price_max;
          renderTab();
        },
      }),
      ...priceFields,
      num("Тривалість, хв", ["services", i, "duration_min"], { min: 5 }),
      num("Буфер після, хв", ["services", i, "buffer_min"], { min: 0, hint: "Прибирання, перерва" }),
      c.prepayment.required && num("Передоплата", ["services", i, "prepayment_amount"], { hint: "Порожньо: загальна сума з «Правил»" }),
      list("Синоніми", ["services", i, "aliases"], { placeholder: "шелак, гель-лак", wide: true }),
      text("Опис для клієнток", ["services", i, "description"], { type: "textarea", wide: true, rows: 2 })));
}

// --- tab: staff ----------------------------------------------------------------------------------

function tabStaff(el) {
  const c = S.cur.config;
  const staff = c.staff;
  put(el,
    h("p", { class: "muted" }, c.calendar_provider === "lead_capture"
      ? "У режимі заявок майстри потрібні лише для інформації."
      : "Бот пропонує час лише тих майстрів, які роблять послугу. Кожну послугу має робити хоча б один майстер."),
    staff.map((m, i) => {
      const title = h("div", { class: "grow" }, m.name || "Новий майстер");
      const idField = text("ID", ["staff", i, "id"], { mono: true, onInput: () => { m._auto = false; } });
      const services = h("div", { class: "choices" }, c.services.map((s) => {
        const input = h("input", { type: "checkbox", checked: m.services.includes(s.id) });
        input.addEventListener("change", () => {
          m.services = input.checked ? [...m.services, s.id] : m.services.filter((id) => id !== s.id);
          markDirty();
        });
        return h("label", { class: "check" }, input, s.name || s.id);
      }));
      return h("div", { class: "item" },
        h("div", { class: "item-head" }, title,
          h("button", { class: "btn small ghost", onclick: () => { m.services = c.services.map((s) => s.id); markDirty(); renderTab(); } }, "Усі послуги"),
          staff.length > 1 && h("button", { class: "icon-btn", title: "Видалити", onclick: () => {
            if (!confirm(`Видалити «${m.name}»?`)) return;
            staff.splice(i, 1);
            markDirty();
            renderTab();
          } }, "✕")),
        h("div", { class: "form-grid" },
          text("Імʼя", ["staff", i, "name"], { onInput: (v) => {
            title.textContent = v || "Новий майстер";
            if (m._auto) { m.id = uniqueId(makeId(v, "master"), staff.filter((x) => x !== m).map((x) => x.id)); idField.querySelector("input").value = m.id; }
          } }),
          idField,
          c.calendar_provider === "google" && text("Google Calendar ID", ["staff", i, "google_calendar_id"], { mono: true, hint: "Порожньо: спільний календар з «Правил»" })),
        h("div", { class: "field", style: "margin-top: .8rem" }, h("span", { class: "label" }, "Послуги"), services));
    }),
    h("div", { class: "add-row" }, h("button", { class: "btn", onclick: () => {
      staff.push({ id: uniqueId("master", staff.map((x) => x.id)), name: "", services: [], _auto: true });
      markDirty();
      renderTab();
    } }, "+ Майстер")));
}

// --- tab: rules --------------------------------------------------------------------------------

function tabRules(el) {
  const c = S.cur.config;
  el.append(h("div", { class: "stack" },
    card("Передоплата",
      checkbox("Потрібна передоплата", ["prepayment", "required"], { onChange: () => renderTab() }),
      c.prepayment.required && h("div", { class: "form-grid", style: "margin-top: .8rem" },
        num("Сума за замовчуванням", ["prepayment", "default_amount"], { min: 1 }),
        num("Строк оплати, год", ["prepayment", "deadline_hours"], { min: 1, max: 168 }),
        text("Реквізити", ["prepayment", "requisites_text"], { type: "textarea", wide: true, hint: "Бот надсилає цей текст дослівно, сам цифри не переписує." }))),
    card("Скасування", h("div", { class: "form-grid" },
      num("Безкоштовне скасування, год до візиту", ["cancellation", "free_cancel_hours"], { min: 0 }),
      text("Правило пізнього скасування", ["cancellation", "late_policy_text"], { type: "textarea", wide: true, placeholder: "Пізніше ніж за 24 години: наступний запис з передоплатою." }))),
    card("Запис", h("div", { class: "form-grid" },
      num("Найраніше через, хв", ["booking", "min_lead_minutes"], { hint: "Скільки часу мінімум до візиту" }),
      num("Записувати на днів уперед", ["booking", "horizon_days"]),
      num("Крок слотів, хв", ["booking", "slot_step_minutes"]),
      num("Скільки вікон пропонувати", ["booking", "max_slots_returned"]),
      num("Активних записів на клієнтку", ["booking", "max_active_bookings_per_client"]),
      h("div", { class: "field" }, h("span", { class: "label" }, "Телефон"), checkbox("Просити телефон при записі", ["booking", "require_phone"])))),
    card("Передача майстру", h("div", { class: "form-grid" },
      num("Бот повертається через, год тиші", ["handoff", "resume_hours"]),
      num("Нагадати майстру через, хв", ["handoff", "owner_reminder_minutes"]),
      num("«Майстер відповість» не частіше, год", ["handoff", "holding_interval_hours"]))),
    c.calendar_provider === "google" && card("Google Календар", h("div", { class: "form-grid" },
      text("Спільний Calendar ID", ["google", "calendar_id"], { mono: true }),
      h("div", { class: "field" }, h("span", { class: "label" }, "Цілоденні події"), checkbox("Вважати день закритим", ["google", "all_day_events_block"])))),
    card("Ліміти й дані", h("div", { class: "form-grid" },
      num("Відповідей на годину на діалог", ["limits", "replies_per_hour"]),
      num("Токенів на день на студію", ["limits", "daily_token_budget"], { hint: "Захист бюджету від спаму" }),
      num("Зберігати листування, днів", ["retention_days"]),
      num("Повторне «я AI» після тиші, днів", ["disclosure_silence_days"])))));
}

// --- tab: faq and tone -------------------------------------------------------------------------

function tabFaq(el) {
  const c = S.cur.config;
  el.append(h("div", { class: "stack" },
    card(null, h("div", { class: "card-head" }, h("h2", null, "Часті питання"),
      h("button", { class: "btn small", onclick: () => { c.faq.push({ q: "", a: "" }); markDirty(); renderTab(); } }, "+ питання")),
      h("p", { class: "muted small" }, "Відповіді бот переказує своїми словами, але факти бере тільки звідси."),
      c.faq.length ? c.faq.map((item, i) => h("div", { class: "item" },
        h("div", { class: "item-head" }, h("div", { class: "grow muted small" }, `#${i + 1}`),
          h("button", { class: "icon-btn", onclick: () => moveItem(c.faq, i, -1) }, "↑"),
          h("button", { class: "icon-btn", onclick: () => moveItem(c.faq, i, 1) }, "↓"),
          h("button", { class: "icon-btn", onclick: () => { c.faq.splice(i, 1); markDirty(); renderTab(); } }, "✕")),
        h("div", { class: "form-grid" },
          text("Питання", ["faq", i, "q"], { wide: true }),
          text("Відповідь", ["faq", i, "a"], { type: "textarea", wide: true, rows: 2 })))) : h("p", { class: "muted" }, "Поки немає.")),
    card("Тон спілкування", h("div", { class: "form-grid" },
      text("Як писати", ["tone", "notes"], { type: "textarea", wide: true, placeholder: "Тепло, коротко, на «ви», з емодзі в міру" }),
      list("Приклади відповідей майстра", ["tone", "examples"], { lines: true, wide: true, rows: 4, hint: "Справжні повідомлення майстра: бот переймає стиль" }))),
    card("Внутрішні нотатки", h("div", { class: "form-grid" },
      text("Тільки для нас", ["internal_notes"], { type: "textarea", wide: true, hint: "Бот цього не бачить: домовленості, ціна для студії, контакти." })))));
}

// --- tab: test ---------------------------------------------------------------------------------

function tabTest(el) {
  const slug = S.cur.slug;
  const log = S.chat[slug] = S.chat[slug] || [];
  const logEl = h("div", { class: "chat-log" });
  const input = h("textarea", { placeholder: "Напишіть як клієнтка…", rows: 1 });
  const stateEl = h("div", { class: "small muted" });

  const draw = () => {
    logEl.replaceChildren(...(log.length ? log : [{ kind: "sys", text: "Тестовий діалог: дані цієї студії, записи пробні, майстру нічого не надходить." }]).map((m) => {
      if (m.kind === "tool") {
        return h("details", { class: "tool-call" }, h("summary", null, `⚙ ${m.name}`),
          h("pre", null, JSON.stringify({ arguments: m.arguments, result: m.result }, null, 2)));
      }
      return h("div", { class: "bubble " + m.kind }, m.text);
    }));
    logEl.scrollTop = logEl.scrollHeight;
  };
  const send = async (textValue) => {
    const value = (textValue ?? input.value).trim();
    if (!value) return;
    input.value = "";
    log.push({ kind: "me", text: value });
    draw();
    const pending = h("div", { class: "bubble sys" }, h("span", { class: "spinner" }), " бот думає…");
    logEl.append(pending);
    logEl.scrollTop = logEl.scrollHeight;
    try {
      const res = await api("POST", `/studios/${slug}/chat`, { text: value });
      for (const t of res.tools) log.push({ kind: "tool", ...t });
      for (const r of res.replies) log.push({ kind: "bot", text: r });
      if (!res.replies.length) log.push({ kind: "sys", text: res.state === "HANDOFF_PENDING" ? "Бот мовчить: діалог у майстра" : `Без відповіді (${res.status})` });
      if (res.state === "HANDOFF_PENDING" && res.handoff_reason) log.push({ kind: "sys", text: `Передано майстру: ${res.handoff_reason}. Натисніть «Новий діалог», щоб продовжити тест.` });
      stateEl.textContent = `Стан: ${res.state}`;
    } catch (err) {
      log.push({ kind: "sys", text: "Помилка: " + err.message });
    }
    draw();
  };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });

  const checkOut = h("div");
  const chatCard = card(null,
    h("div", { class: "card-head" }, h("h2", null, "Тестовий чат"),
      h("button", { class: "btn small", onclick: async () => {
        try { await api("POST", `/studios/${slug}/chat/reset`); } catch (err) { return fail(err); }
        log.length = 0; stateEl.textContent = ""; draw();
      } }, "Новий діалог")),
    isDirty() && h("div", { class: "banner warn" }, "Є незбережені зміни: бот відповідає за збереженою версією."),
    h("div", { class: "chat" }, logEl,
      h("div", { class: "chat-input" }, input, h("button", { class: "btn primary", onclick: () => send() }, "↑"))),
    stateEl);
  const side = h("div", { class: "stack" },
    card("Швидкі питання", h("div", { class: "chips" }, TEST_PROMPTS.map((p) => h("button", { class: "chip", onclick: () => send(p) }, p)))),
    card("Автоперевірка",
      h("p", { class: "muted small" }, "10 питань, кожне в окремому діалозі. Хвилина-дві."),
      h("button", { class: "btn primary", onclick: (e) => busy(e.currentTarget, async () => {
        try {
          S.checks[slug] = await api("POST", `/studios/${slug}/check`);
          await refreshDetail();
          drawCheck(checkOut, S.checks[slug]);
        } catch (err) { fail(err); }
      }) }, "Запустити")));
  el.append(h("div", { class: "chat-layout" }, chatCard, side), h("div", { style: "margin-top: 1rem" }, checkOut));
  draw();
  if (S.checks[slug]) drawCheck(checkOut, S.checks[slug]);
}

function drawCheck(out, results) {
  const badge = { ok: ["ok", "Добре"], check: ["warn", "Прочитайте"], warn: ["bad", "Проблема"] };
  out.replaceChildren(card("Результати автоперевірки", h("div", { class: "table-wrap" }, h("table", null,
    h("thead", null, h("tr", null, h("th", null, "Питання"), h("th", null, "Відповідь бота"), h("th", null, "Оцінка"))),
    h("tbody", null, results.map((r) => h("tr", null,
      h("td", null, r.question),
      h("td", null, r.replies.join("\n\n") || h("span", { class: "muted" }, r.state === "HANDOFF_PENDING" ? `передано майстру (${r.handoff_reason})` : "немає відповіді"),
        r.tools.length ? h("div", { class: "muted small" }, "⚙ " + r.tools.map((t) => t.name).join(", ")) : null),
      h("td", null, h("span", { class: "badge " + badge[r.verdict][0] }, badge[r.verdict][1]), r.note && h("div", { class: "small muted" }, r.note)))))))));
}

// --- tab: AI update ----------------------------------------------------------------------------

function tabUpdate(el) {
  const textarea = h("textarea", { rows: 8, placeholder: "Наприклад: «З 1 грудня манікюр 950, педикюр 1200. 31.12 працюю до 15:00. Додайте послугу корекція нарощування 800 грн, 2 години.»" });
  const out = h("div");
  el.append(card("Оновити дані з повідомлення майстра",
    h("p", { class: "muted small" }, "Вставте, що змінилося. AI внесе зміни у форму, ви побачите різницю й збережете. Без вашого «Зберегти» бот нічого не дізнається."),
    textarea,
    h("div", { class: "row", style: "margin-top: .75rem" },
      h("button", { class: "btn primary", onclick: (e) => busy(e.currentTarget, async () => {
        if (textarea.value.trim().length < 20) return toast("Додайте більше тексту", true);
        try {
          const res = await api("POST", "/import", { text: textarea.value, slug: S.cur.slug });
          drawUpdate(out, res);
        } catch (err) { fail(err); }
      }) }, "Підготувати зміни")),
    out));
}

function drawUpdate(out, res) {
  if (!res.config) {
    out.replaceChildren(h("div", { class: "banner bad", style: "margin-top: 1rem" }, res.errors.map((e) => e.msg).join("; ")));
    return;
  }
  out.replaceChildren(h("div", { style: "margin-top: 1rem" },
    res.warnings.length ? h("div", { class: "banner warn" }, h("b", null, "Перевірте:"), h("ul", null, res.warnings.map((w) => h("li", null, w)))) : null,
    res.questions.length ? h("div", { class: "banner info" }, h("b", null, "Уточніть у майстра:"), h("ul", null, res.questions.map((q) => h("li", null, q)))) : null,
    res.errors.length ? h("div", { class: "banner bad" }, h("b", null, "Після застосування виправте:"), h("ul", null, res.errors.map((e) => h("li", null, `${locLabel(e.loc)}: ${errorText(e.msg)}`)))) : null,
    res.diff.length ? diffTable(res.diff) : h("p", { class: "muted" }, "AI не знайшов змін."),
    res.diff.length ? h("div", { class: "row", style: "margin-top: .75rem" },
      h("button", { class: "btn primary", onclick: () => {
        S.cur.config = normalize(res.config);
        S.cur.banner = { questions: res.questions, warnings: res.warnings, errors: [] };
        markDirty();
        toast("Зміни у формі. Перегляньте й натисніть «Зберегти»");
        renderStudioPage();
      } }, "Застосувати у форму")) : null));
}

// --- tab: history ------------------------------------------------------------------------------

function tabHistory(el) {
  const versions = S.cur.detail.versions;
  el.append(card("Версії даних",
    h("p", { class: "muted small" }, "Кожне збереження — нова версія. Відкат створює ще одну версію, нічого не губиться."),
    h("div", { class: "table-wrap" }, h("table", null,
      h("thead", null, h("tr", null, h("th", null, "Версія"), h("th", null, "Коли"), h("th", null, "Джерело"), h("th", null, ""))),
      h("tbody", null, versions.map((v) => h("tr", null,
        h("td", null, "v" + v.version, v.version === S.cur.detail.config_version ? h("span", { class: "badge ok", style: "margin-left: .4rem" }, "поточна") : null),
        h("td", null, fmtDate(v.created_at)),
        h("td", { class: "muted" }, v.source || ""),
        h("td", null, v.version !== S.cur.detail.config_version && h("button", { class: "btn small", onclick: () => showVersion(v.version) }, "Порівняти")))))))));
}

async function showVersion(version) {
  let res;
  try { res = await api("GET", `/studios/${S.cur.slug}/versions/${version}`); }
  catch (err) { return fail(err); }
  const body = h("div", null,
    h("p", { class: "muted small" }, `Різниця між v${version} і поточною версією (стовпець «Стане» — поточні значення).`),
    res.diff.length ? diffTable(res.diff) : h("p", null, "Однакові."));
  modal(`Версія ${version}`, body, [
    ["Закрити", "", null],
    [`Відкотити до v${version}`, "primary", async (close) => {
      if (isDirty() && !confirm("Незбережені зміни зникнуть. Продовжити?")) return;
      try {
        const out = await api("POST", `/studios/${S.cur.slug}/rollback/${version}`);
        if (!out.ok) return toast(out.errors.map((e) => e.msg).join("; "), true);
        close();
        toast(`Відкочено, нова версія ${out.version}`);
        S.cur = null;
        await loadStudios();
        await openStudio(out.slug, "history");
      } catch (err) { fail(err); }
    }],
  ]);
}

// --- tab: json ---------------------------------------------------------------------------------

function tabJson(el) {
  const area = h("textarea", { class: "code", spellcheck: "false" });
  area.value = JSON.stringify(clean(S.cur.config), null, 2);
  el.append(card("JSON",
    h("p", { class: "muted small" }, "Для масових правок. «Застосувати» переносить JSON у форму; зберігається кнопкою внизу."),
    area,
    h("div", { class: "row", style: "margin-top: .75rem" },
      h("button", { class: "btn primary", onclick: () => {
        try {
          S.cur.config = normalize({ ...JSON.parse(area.value), _autoSlug: false });
          markDirty();
          toast("Застосовано");
        } catch (err) { toast("JSON з помилкою: " + err.message, true); }
      } }, "Застосувати"),
      h("button", { class: "btn", onclick: () => copy(area.value) }, "Копіювати"),
      h("button", { class: "btn", onclick: () => {
        const blob = new Blob([area.value], { type: "application/json" });
        const a = h("a", { href: URL.createObjectURL(blob), download: `${S.cur.config.slug || "studio"}.json` });
        a.click();
        URL.revokeObjectURL(a.href);
      } }, "Завантажити"))));
}

// --- leads -------------------------------------------------------------------------------------

async function renderLeads() {
  const leads = await api("GET", "/leads");
  const counts = Object.fromEntries(Object.keys(LEAD_STATUS).map((k) => [k, leads.filter((l) => l.status === k).length]));
  $app.replaceChildren(
    h("div", { class: "page-head" }, h("div", null, h("h1", null, "Заявки з сайту"),
      h("p", null, `Нові: ${counts.new}, на звʼязку: ${counts.contacted}, клієнти: ${counts.won}, відмови: ${counts.lost}. Кожна нова приходить засновникам у Telegram.`))),
    leads.length ? card(null, h("div", { class: "table-wrap" }, h("table", null,
      h("thead", null, h("tr", null, h("th", null, "Коли"), h("th", null, "Хто"), h("th", null, "Контакт"), h("th", null, "Що цікавить"), h("th", null, "Статус"))),
      h("tbody", null, leads.map((l) => {
        const status = h("select", null, Object.entries(LEAD_STATUS).map(([k, v]) => h("option", { value: k }, v)));
        status.value = l.status;
        status.addEventListener("change", async () => {
          try { await api("POST", `/leads/${l.id}`, { status: status.value }); toast("Збережено"); }
          catch (err) { fail(err); }
        });
        return h("tr", null,
          h("td", { class: "small" }, fmtDate(l.created_at)),
          h("td", null, h("b", null, l.name), l.business && h("div", { class: "small muted" }, l.business)),
          h("td", null, l.contact),
          h("td", null, LEAD_SERVICES[l.service] || l.service || "—", l.message && h("div", { class: "small muted" }, l.message)),
          h("td", { style: "min-width: 140px" }, status));
      })))))
      : h("div", { class: "card empty" }, h("h2", null, "Заявок поки немає"), h("p", null, "Форма на лендингу надсилає їх сюди й у Telegram.")));
}

// --- system ------------------------------------------------------------------------------------

async function renderSystem() {
  const health = await api("GET", "/health");
  const cmd = (c, d) => h("tr", null, h("td", null, h("code", null, c)), h("td", { class: "muted" }, d));
  $app.replaceChildren(
    h("div", { class: "page-head" }, h("div", null, h("h1", null, "Система"), h("p", null, "Стан черги, помилки й шпаргалка."))),
    h("div", { class: "stack" },
      card("Стан", h("pre", null, health.text)),
      card("Модель", h("p", null, S.me.llm.ready ? `Провайдер ${S.me.llm.provider}, модель ${S.me.llm.model}.` : "Модель не налаштована: бот відповідає шаблоном і передає майстру. Задайте OPENAI_API_KEY і LLM_MODEL.")),
      card("Шпаргалка", h("div", { class: "table-wrap" }, h("table", null, h("tbody", null,
        cmd("/admin", "Owner Bot: посилання для входу сюди"),
        cmd("/tenants, /health", "Owner Bot: студії й стан системи"),
        cmd("/pause_all, /resume_all", "Owner Bot: зупинити або запустити всіх ботів"),
        cmd("/forget <client_id>", "Owner Bot: видалити дані клієнтки"),
        cmd("make eval", "Прогін eval-кейсів на справжній моделі"),
        cmd("dc logs -f worker api", "Логи на сервері (див. docs/runbook.md)"),
        cmd("deploy/backup.sh", "Бекап бази"),
      ))))));
}

boot();
