import { t, lang, setLanguage, number } from "./i18n.js";
import { STATUSES, validateTicket, deadline } from "./domain.js";
import { icon } from "./icons.js";
import {
  shell,
  workspace,
  analytics,
  guide,
  ticketForm,
  detail,
  bulkForm,
  bulkBar,
  alertsPanel,
  escapeHTML as e,
} from "./views.js";
import {
  setupMotion,
  animateShell,
  beforeRender,
  animatePage,
  animateDialog,
  animateToast,
  animateTheme,
} from "./motion.js";

const $ = (selector) => document.querySelector(selector);
const safeStorage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
};
const drafts = {
  get(key) {
    try {
      return JSON.parse(sessionStorage.getItem("nexo-draft-" + key));
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      sessionStorage.setItem("nexo-draft-" + key, JSON.stringify(value));
    } catch {}
  },
  remove(key) {
    try {
      sessionStorage.removeItem("nexo-draft-" + key);
    } catch {}
  },
};
const defaultFilters = () => ({
  q: "",
  status: "",
  priority: "",
  category: "",
  assigneeId: "",
  deadline: "",
  sort: "priority",
});
const state = {
  page: "overview",
  queue: "all",
  view: safeStorage.get("nexo-view") === "board" ? "board" : "list",
  theme: document.documentElement.dataset.theme,
  days: 7,
  filters: defaultFilters(),
  filtersOpen: false,
  hideRadar: false,
  listPage: 1,
  selected: new Set(),
  agents: [],
  tickets: [],
  summary: {
    total: 0,
    open: 0,
    progress: 0,
    overdue: 0,
    resolved: 0,
    queues: {},
    alerts: [],
    priorities: [],
    categories: [],
    trend: [],
  },
  loading: true,
  error: null,
  syncedAt: new Date(),
};
let requestId = 0,
  searchTimer,
  toastTimer,
  modal = { mode: null, ticket: null, events: [], initial: "", busy: false },
  opener = null,
  confirmResolve = null,
  undoToken = null;
const dialog = $("#ticket-dialog"),
  confirmation = $("#confirm-dialog");
async function api(path, options = {}) {
  let response;
  try {
    response = await fetch("/api" + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw { code: "networkError" };
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw { code: "serverError" };
  }
  if (!response.ok)
    throw { code: data.error || "serverError", fields: data.fields };
  return data;
}
function params() {
  const query = new URLSearchParams({ queue: state.queue });
  for (const [k, v] of Object.entries(state.filters)) if (v) query.set(k, v);
  return query;
}
function updateNav() {
  document.querySelectorAll(".sidebar [data-page]").forEach((el) => {
    const active = el.dataset.page === state.page;
    el.classList.toggle("active", active);
    if (active) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
  document
    .querySelectorAll(".sidebar [data-queue]")
    .forEach((el) =>
      el.classList.toggle(
        "active",
        state.page === "tickets" && el.dataset.queue === state.queue,
      ),
    );
  document
    .querySelectorAll("[data-count]")
    .forEach(
      (el) =>
        (el.textContent = number(state.summary.queues[el.dataset.count] || 0)),
    );
  const count = $('.sidebar [data-page="tickets"] .nav-count');
  if (count) count.textContent = number(state.summary.total);
  $("#breadcrumb-current").textContent = t(state.page);
  $(".alert-dot").hidden = !state.summary.alerts.length;
}
function renderPage({ flip = false, entrance = false } = {}) {
  const focus = document.activeElement,
    id = focus?.id,
    start = focus?.selectionStart,
    end = focus?.selectionEnd;
  const flipState = beforeRender(flip);
  $("#main-content").innerHTML =
    state.page === "analytics"
      ? analytics(state)
      : state.page === "guide"
        ? guide(state)
        : workspace(state);
  updateNav();
  animatePage(flipState, entrance);
  if (id && $("#" + id)) {
    const target = $("#" + id);
    target.focus({ preventScroll: true });
    if (target.setSelectionRange && start !== null)
      try {
        target.setSelectionRange(start, end);
      } catch {}
  }
}
function renderShell() {
  beforeRender();
  $("#app").innerHTML = shell(state);
  renderPage();
}
async function load({ loading = false, entrance = false } = {}) {
  const id = ++requestId;
  if (loading) {
    state.loading = true;
    renderPage();
  }
  try {
    const [result, summary] = await Promise.all([
      api("/tickets?" + params()),
      api("/summary?days=" + state.days),
    ]);
    if (id !== requestId) return;
    state.tickets = result.tickets;
    state.summary = summary;
    state.error = null;
    state.loading = false;
    state.syncedAt = new Date();
    state.listPage = Math.min(
      state.listPage,
      Math.max(1, Math.ceil(state.tickets.length / 8)),
    );
    const present = new Set(state.tickets.map((t) => t.id));
    state.selected = new Set(
      [...state.selected].filter((id) => present.has(id)),
    );
    renderPage({ entrance });
  } catch (err) {
    if (id !== requestId) return;
    state.loading = false;
    state.error = err.code || "serverError";
    renderPage();
    toast(state.error, null, true);
  }
}
function toast(key, token = null, error = false) {
  clearTimeout(toastTimer);
  undoToken = token;
  $("#toasts").innerHTML =
    `<div class="toast">${icon(error ? "circle" : "check")}<div>${t(key)}${token ? `<small>${t("undoHint")}</small>` : ""}</div>${token ? `<button data-action="undo">${t("undo")}</button>` : ""}<button data-action="toast-close" aria-label="${t("dismissNotification")}">${icon("close")}</button></div>`;
  animateToast($(".toast"));
  toastTimer = setTimeout(
    () => {
      $("#toasts").innerHTML = "";
      undoToken = null;
    },
    token ? 60000 : 6500,
  );
}
function captureForm() {
  const f = $("#ticket-form");
  if (!f) return null;
  const data = Object.fromEntries(new FormData(f));
  data.assigneeId = Number(data.assigneeId);
  data.tags = data.tags
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const date = new Date(data.dueAt);
  data.dueAt = Number.isFinite(date.getTime()) ? date.toISOString() : "";
  if (modal.ticket?.id) data.version = modal.ticket.version;
  return data;
}
function draftKey() {
  return modal.ticket?.id ? "edit-" + modal.ticket.id : "new";
}
function rememberDraft() {
  if (modal.mode === "form") {
    const data = captureForm();
    if (data) drafts.set(draftKey(), data);
  }
  if (modal.mode === "detail" && $("#note"))
    drafts.set("note-" + modal.ticket.id, $("#note").value);
}
function showModal(content, drawer = false) {
  const wasOpen = dialog.open;
  if (!wasOpen) opener = document.activeElement;
  const notices = $("#toasts");
  document.body.append(notices);
  dialog.className = drawer ? "drawer" : "";
  dialog.innerHTML = content;
  dialog.append(notices);
  if (!wasOpen) dialog.showModal();
  dialog.scrollTop = 0;
  animateDialog(dialog);
  const first = dialog.querySelector("input,textarea");
  if (modal.mode === "form" && first) first.focus({ preventScroll: true });
  else
    dialog
      .querySelector('[data-action="dialog-close"]')
      ?.focus({ preventScroll: true });
}
function confirmAction(title, text, accept = "apply") {
  confirmation.innerHTML = `<div class="confirm-body"><h2 id="confirm-title">${t(title)}</h2><p>${text}</p></div><div class="dialog-actions"><button class="button" data-confirm="no">${t(title === "discardTitle" ? "keepEditing" : "cancel")}</button><button class="button primary" data-confirm="yes">${t(accept)}</button></div>`;
  confirmation.showModal();
  confirmation.querySelector('[data-confirm="no"]').focus();
  return new Promise((resolve) => (confirmResolve = resolve));
}
async function closeModal(force = false) {
  if (modal.busy) return;
  const dirty =
    (modal.mode === "form" &&
      JSON.stringify(captureForm()) !== modal.initial) ||
    (modal.mode === "detail" && $("#note")?.value.trim());
  if (!force && dirty) {
    const allowed = await confirmAction(
      "discardTitle",
      t(modal.mode === "detail" ? "unsavedNote" : "discardText"),
      "keepDraft",
    );
    if (!allowed) return;
    rememberDraft();
  }
  animateDialog(dialog, true, () => {
    document.body.append($("#toasts"));
    dialog.close();
    dialog.innerHTML = "";
    modal = { mode: null, ticket: null, events: [], initial: "", busy: false };
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    else $('[data-action="new"]')?.focus({ preventScroll: true });
  });
}
async function openTicket(id) {
  if (modal.busy) return;
  rememberDraft();
  modal = { mode: "loading", ticket: null, events: [], busy: false };
  showModal(
    `<div class="dialog-head"><h2 id="dialog-title">${t("loading")}</h2><button class="icon-button" data-action="dialog-close" aria-label="${t("close")}">${icon("close")}</button></div><div class="dialog-body"><div class="loading-line"></div></div>`,
    true,
  );
  const ticketRequest = Symbol();
  modal.request = ticketRequest;
  try {
    const result = await api("/tickets/" + id);
    if (modal.request !== ticketRequest || !dialog.open) return;
    modal = { mode: "detail", ...result, busy: false };
    showModal(
      detail(
        state,
        result.ticket,
        result.events,
        drafts.get("note-" + id) || "",
      ),
      true,
    );
  } catch (err) {
    if (modal.request !== ticketRequest) return;
    await closeModal(true);
    toast(err.code, null, true);
  }
}
function openForm(ticket = null) {
  rememberDraft();
  modal = { mode: "form", ticket, events: [], initial: "", busy: false };
  const draft = drafts.get(draftKey());
  // Old drafts keep their original version so a newer edit cannot be overwritten silently.
  const data = { ...(ticket || {}), ...(draft || {}) };
  if (ticket && draft?.version)
    modal.ticket = { ...ticket, version: draft.version };
  showModal(ticketForm(state, data));
  modal.initial = JSON.stringify(captureForm());
  if (draft) toast("draftRestored");
}
function errors(form, err) {
  form
    .querySelectorAll("[aria-invalid]")
    .forEach((el) => el.removeAttribute("aria-invalid"));
  form
    .querySelectorAll("[data-invalid]")
    .forEach((el) => el.removeAttribute("data-invalid"));
  form.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
  const banner = form.querySelector(".form-banner");
  if (banner) banner.textContent = t(err.code || "validation");
  for (const [key, code] of Object.entries(err.fields || {})) {
    const input = form.elements.namedItem(key);
    input?.setAttribute("aria-invalid", "true");
    input?.closest(".field")?.setAttribute("data-invalid", "true");
    const label = form.querySelector("#error-" + key);
    if (label) label.textContent = t(code);
  }
  form.querySelector("[aria-invalid=true]")?.focus();
}
async function mutation(fn, key = "saved") {
  if (modal.busy) return;
  modal.busy = true;
  dialog.querySelectorAll("button").forEach((b) => (b.disabled = true));
  try {
    const result = await fn();
    modal.busy = false;
    await load();
    toast(key, result.undoToken);
    return result;
  } catch (err) {
    modal.busy = false;
    dialog.querySelectorAll("button").forEach((b) => (b.disabled = false));
    throw err;
  }
}
async function saveTicket(form) {
  const data = captureForm(),
    validation = validateTicket(data, state.agents);
  if (Object.keys(validation).length) {
    errors(form, { fields: validation });
    return;
  }
  if (modal.busy) return;
  const key = draftKey(),
    id = modal.ticket?.id;
  try {
    const result = await mutation(() =>
      api(id ? "/tickets/" + id : "/tickets", {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(data),
      }),
    );
    if (!result) return;
    drafts.remove(key);
    modal.mode = "loading";
    await openTicket(result.ticket.id);
  } catch (err) {
    errors(form, err);
  }
}
async function saveNote(form) {
  const text = form.elements.note.value.trim();
  if (!text || text.length > 2000) {
    $("#error-note").textContent = t("noteInvalid");
    form.elements.note.setAttribute("aria-invalid", "true");
    return;
  }
  const ticket = modal.ticket;
  try {
    const result = await mutation(
      () =>
        api("/tickets/" + ticket.id + "/notes", {
          method: "POST",
          body: JSON.stringify({ text, version: ticket.version }),
        }),
      "noteSaved",
    );
    if (!result) return;
    drafts.remove("note-" + ticket.id);
    form.elements.note.value = "";
    await openTicket(ticket.id);
  } catch (err) {
    $("#error-note").textContent = t(err.code);
  }
}
async function quickStatus(status) {
  const ticket = modal.ticket;
  if (!ticket) return;
  try {
    const result = await mutation(() =>
      api("/tickets/" + ticket.id, {
        method: "PATCH",
        body: JSON.stringify({ status, version: ticket.version }),
      }),
    );
    if (result) await openTicket(ticket.id);
  } catch (err) {
    toast(err.code, null, true);
  }
}
async function saveBulk(form) {
  const changes = Object.fromEntries(
    [...new FormData(form)].filter(([, v]) => v),
  );
  if (changes.assigneeId) changes.assigneeId = Number(changes.assigneeId);
  if (!Object.keys(changes).length) {
    errors(form, { code: "nothingChanged" });
    return;
  }
  if (
    !(await confirmAction(
      "bulkTitle",
      t("bulkInfo", { n: state.selected.size }),
    ))
  )
    return;
  const ids = [...state.selected],
    versions = Object.fromEntries(
      state.tickets
        .filter((t) => state.selected.has(t.id))
        .map((t) => [t.id, t.version]),
    );
  try {
    const result = await mutation(
      () =>
        api("/bulk", {
          method: "POST",
          body: JSON.stringify({ ids, versions, changes }),
        }),
      "bulkSaved",
    );
    if (result) {
      state.selected.clear();
      renderPage();
      closeModal(true);
    }
  } catch (err) {
    errors(form, err);
  }
}
function exportCSV() {
  const query = params();
  query.set("lang", lang);
  const a = document.createElement("a");
  a.href = "/api/tickets.csv?" + query;
  a.download = "nexo-desk.csv";
  a.hidden = true;
  document.body.append(a);
  a.click();
  a.remove();
  toast("csvSaved");
}
function toggleMenu(open) {
  const sidebar = $("#sidebar");
  sidebar.classList.toggle("open", open);
  $(".nav-backdrop").classList.toggle("open", open);
  $(".main").inert = open;
  const button = $('[data-action="menu"]');
  button?.setAttribute("aria-expanded", String(open));
  if (open) sidebar.querySelector(".mobile-close").focus();
  else button?.focus();
}
function navigate(page, queue) {
  state.page = page;
  if (queue !== undefined) state.queue = queue;
  else if (page !== "tickets") state.queue = "all";
  state.selected.clear();
  state.listPage = 1;
  toggleMenu(false);
  renderPage({ entrance: true });
  if (page !== "guide") load();
  $("#main-content").focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}
document.addEventListener("click", async (event) => {
  const el = event.target.closest("button,a");
  if (!el) return;
  if (el.dataset.confirm) {
    const result = el.dataset.confirm === "yes";
    confirmation.close();
    confirmResolve?.(result);
    confirmResolve = null;
    return;
  }
  if (el.dataset.page) {
    event.preventDefault();
    navigate(el.dataset.page);
    return;
  }
  if (el.dataset.queue) {
    state.filters = defaultFilters();
    navigate("tickets", el.dataset.queue);
    return;
  }
  if (el.dataset.ticket) {
    await openTicket(Number(el.dataset.ticket));
    return;
  }
  if (el.dataset.lang) {
    rememberDraft();
    setLanguage(el.dataset.lang);
    clearTimeout(toastTimer);
    $("#toasts").innerHTML = "";
    renderShell();
    return;
  }
  if (el.dataset.view) {
    state.view = el.dataset.view;
    safeStorage.set("nexo-view", state.view);
    renderPage({ flip: true });
    return;
  }
  const action = el.dataset.action;
  if (!action) return;
  if (action === "new") openForm();
  else if (action === "edit") openForm(modal.ticket);
  else if (action === "dialog-close") closeModal();
  else if (action === "resolve") quickStatus("resolved");
  else if (action === "reopen") quickStatus("open");
  else if (action === "close-ticket") quickStatus("closed");
  else if (action === "theme") {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = state.theme;
    safeStorage.set("nexo-theme", state.theme);
    el.innerHTML = icon(state.theme === "dark" ? "sun" : "moon");
    el.setAttribute("aria-label", t(state.theme === "dark" ? "light" : "dark"));
    el.title = t(state.theme === "dark" ? "light" : "dark");
    animateTheme(el);
  } else if (action === "menu") toggleMenu(true);
  else if (action === "menu-close") toggleMenu(false);
  else if (action === "filters") {
    state.filtersOpen = !state.filtersOpen;
    renderPage();
    $('[data-action="filters"]')?.focus();
  } else if (action === "focus") {
    state.hideRadar = !state.hideRadar;
    renderPage();
  } else if (action === "reset") {
    state.filters = defaultFilters();
    state.queue = "all";
    state.listPage = 1;
    state.selected.clear();
    await load();
  } else if (action === "refresh") await load({ loading: true });
  else if (action === "next" || action === "prev") {
    state.listPage += action === "next" ? 1 : -1;
    renderPage();
  } else if (action === "export") exportCSV();
  else if (action === "clear-selection") {
    state.selected.clear();
    renderPage();
  } else if (action === "bulk") {
    modal = { mode: "bulk", ticket: null, events: [], busy: false };
    showModal(bulkForm(state));
  } else if (action === "alerts") {
    modal = { mode: "alerts", ticket: null, events: [], busy: false };
    showModal(alertsPanel(state), true);
  } else if (action === "toast-close") {
    clearTimeout(toastTimer);
    $("#toasts").innerHTML = "";
    undoToken = null;
  } else if (action === "undo" && undoToken) {
    const token = undoToken;
    el.disabled = true;
    try {
      await api("/undo", { method: "POST", body: JSON.stringify({ token }) });
      await load();
      if (dialog.open && modal.mode === "detail")
        await openTicket(modal.ticket.id);
      toast("undone");
    } catch (err) {
      toast(err.code, null, true);
    }
  }
});
document.addEventListener("click", (event) => {
  if (event.target.classList.contains("nav-backdrop")) toggleMenu(false);
});
document.addEventListener("change", (event) => {
  const el = event.target;
  if (el.dataset.filter) {
    state.filters[el.dataset.filter] = el.value;
    state.listPage = 1;
    state.selected.clear();
    load();
  }
  if (el.dataset.setting === "days") {
    state.days = Number(el.value);
    load();
  }
  if (el.matches("[data-select]")) {
    const id = Number(el.dataset.select);
    if (el.checked) state.selected.add(id);
    else state.selected.delete(id);
    el.closest("[data-flip-id]")?.classList.toggle("selected", el.checked);
    $("#bulk-slot").innerHTML = bulkBar(state);
    const all = $("[data-select-all]");
    if (all) {
      const checks = [...document.querySelectorAll("[data-select]")];
      all.checked = checks.every((c) => c.checked);
      all.indeterminate = checks.some((c) => c.checked) && !all.checked;
    }
  }
  if (el.matches("[data-select-all]")) {
    state.tickets
      .slice((state.listPage - 1) * 8, state.listPage * 8)
      .forEach((ticket) =>
        el.checked
          ? state.selected.add(ticket.id)
          : state.selected.delete(ticket.id),
      );
    renderPage();
  }
});
document.addEventListener("input", (event) => {
  if (event.target.id === "search") {
    state.filters.q = event.target.value;
    state.listPage = 1;
    state.selected.clear();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => load(), 220);
  }
  if (dialog.contains(event.target)) rememberDraft();
});
document.addEventListener("submit", (event) => {
  if (["ticket-form", "note-form", "bulk-form"].includes(event.target.id)) {
    event.preventDefault();
    if (event.target.id === "ticket-form") saveTicket(event.target);
    else if (event.target.id === "note-form") saveNote(event.target);
    else saveBulk(event.target);
  }
});
dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeModal();
});
confirmation.addEventListener("cancel", (event) => {
  event.preventDefault();
  confirmation.close();
  confirmResolve?.(false);
  confirmResolve = null;
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && $("#sidebar")?.classList.contains("open")) {
    toggleMenu(false);
    return;
  }
  if (
    dialog.open ||
    confirmation.open ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.target.closest("input,textarea,select,[contenteditable=true]")
  )
    return;
  if (event.key.toLowerCase() === "n") {
    event.preventDefault();
    openForm();
  }
  if (event.key === "/") {
    event.preventDefault();
    if (!$("#search")) navigate("tickets");
    $("#search")?.focus();
  }
});
window.addEventListener("beforeunload", (event) => {
  if (
    (modal.mode === "form" &&
      JSON.stringify(captureForm()) !== modal.initial) ||
    (modal.mode === "detail" && $("#note")?.value.trim())
  ) {
    rememberDraft();
    event.preventDefault();
    event.returnValue = "";
  }
});

setupMotion();
setLanguage(lang);
renderShell();
try {
  const meta = await api("/meta");
  state.agents = meta.agents;
  renderShell();
  animateShell();
  await load({ entrance: true });
} catch (err) {
  state.loading = false;
  state.error = err.code;
  renderPage();
  toast(err.code, null, true);
}
