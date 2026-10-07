import {
  t,
  lang,
  dateTime,
  number,
  priorityLabel,
  queueLabel,
} from "./i18n.js";
import { icon, logo } from "./icons.js";
import {
  STATUSES,
  PRIORITIES,
  CATEGORIES,
  deadline,
  isDone,
} from "./domain.js";
export const escapeHTML = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const e = escapeHTML;
export const button = (label, action, ico, cls = "") =>
  `<button class="button ${cls}" data-action="${action}" aria-label="${t(label)}" title="${t(label)}">${ico ? icon(ico) : ""}<span>${t(label)}</span></button>`;
const iconButton = (label, action, ico, cls = "") =>
  `<button class="icon-button ${cls}" data-action="${action}" aria-label="${t(label)}" title="${t(label)}">${icon(ico)}</button>`;
const options = (items, selected, label = t) =>
  items
    .map(
      (key) =>
        `<option value="${key}" ${String(selected) === String(key) ? "selected" : ""}>${e(label(key))}</option>`,
    )
    .join("");
const agentName = (state, id) =>
  state.agents.find((a) => a.id === Number(id))?.name || "";
const avatar = (state, id) => {
  const a = state.agents.find((a) => a.id === id);
  return `<span class="avatar" role="img" title="${e(a?.name)}" aria-label="${e(a?.name)}">${e(a?.initials)}</span>`;
};
const statusBadge = (status) =>
  `<span class="status ${status}">${t(status)}</span>`;
const priorityBadge = (priority) =>
  `<span class="ticket-priority ${priority}"><span class="priority-bars" data-level="${priority}" aria-hidden="true"><i></i><i></i><i></i></span>${priorityLabel(priority)}</span>`;
const period = (state) =>
  `<select class="period-select" data-setting="days" aria-label="${t("period")}">${options([7, 30, 90], state.days, (k) => t("days" + k))}</select>`;
export function shell(state) {
  const nav = (page, label, ico) =>
    `<button data-page="${page}" class="nav-item ${state.page === page ? "active" : ""}" ${state.page === page ? 'aria-current="page"' : ""}>${icon(ico)}<span>${t(label)}</span>${page === "tickets" ? `<span class="nav-count">${number(state.summary.total)}</span>` : ""}</button>`;
  return `<a class="skip" href="#main-content">${t("skip")}</a><div class="nav-backdrop" data-action="menu-close"></div><div class="shell"><aside class="sidebar" id="sidebar" aria-label="${t("workspace")}"><a class="brand" href="#" data-page="overview" aria-label="Nexo Desk">${logo()}<span class="brand-word">nexo<span>desk</span></span></a>${iconButton("closeMenu", "menu-close", "close", "mobile-close")}<div class="workspace-badge"><span class="workspace-icon">${icon("inbox")}</span><span>Nexo Workspace<small>${t("local")}</small></span>${icon("down")}</div><nav class="nav-group" aria-label="${t("workspace")}">${nav("overview", "overview", "grid")}${nav("tickets", "tickets", "inbox")}${nav("analytics", "analytics", "chart")}</nav><p class="nav-label">${t("queues")}</p><nav class="nav-group" aria-label="${t("queues")}">${["mine", "urgent", "soon", "overdue", "resolved"].map((q) => `<button class="nav-item ${state.queue === q && state.page === "tickets" ? "active" : ""}" data-queue="${q}"><span class="queue-dot ${q}"></span><span>${queueLabel(q)}</span><span class="nav-count" data-count="${q}">${number(state.summary.queues[q] || 0)}</span></button>`).join("")}</nav><div class="sidebar-bottom"><div class="nav-group">${nav("guide", "guide", "book")}</div><div class="demo-box"><span class="eyebrow"><i class="live-dot"></i>${t("demo")}</span><p>${t("demoShort")}</p></div><div class="user-profile" title="${t("currentAgent")}">${avatar(state, 1)}<div><strong>Alex Morgan</strong><small>${t("currentAgent")}</small></div></div></div></aside><div class="main"><header class="topbar"><div class="breadcrumb">${iconButton("menu", "menu", "menu", "mobile-menu")}<span class="mobile-brand">${logo()}</span><span>Nexo Workspace</span>${icon("chevron")}<strong id="breadcrumb-current">${t(state.page)}</strong></div><div class="top-actions">${iconButton("refresh", "refresh", "refresh", "refresh-button")}<div class="language-switch" role="group" aria-label="${t("language")}"><button data-lang="pt-BR" aria-label="Português do Brasil" aria-pressed="${lang === "pt-BR"}">PT</button><button data-lang="en" aria-label="English" aria-pressed="${lang === "en"}">EN</button></div><span class="divider"></span>${iconButton(state.theme === "dark" ? "light" : "dark", "theme", state.theme === "dark" ? "sun" : "moon")}<button class="icon-button" data-action="alerts" aria-label="${t("alerts")}">${icon("bell")}<i class="alert-dot" ${state.summary.alerts.length ? "" : "hidden"}></i></button></div></header><main id="main-content" class="content" tabindex="-1"></main></div></div>`;
}
export function metrics(state) {
  const s = state.summary;
  return `<div class="stats">${[
    ["open", "openCount", "inbox", "needsTriage", ""],
    ["progress", "progressCount", "clock", "inMotion", ""],
    ["overdue", "overdueCount", "flame", "attention", "stat-alert"],
    ["resolved", "resolvedCount", "check", "completedPeriod", "stat-done"],
  ]
    .map(
      ([key, label, ico, foot, cls]) =>
        `<div class="stat ${cls}"><div class="stat-label">${icon(ico)}${t(label)}</div><div class="stat-number" data-count-value="${s[key]}">${number(s[key])}</div><div class="stat-foot">${t(foot)}</div></div>`,
    )
    .join("")}</div>`;
}
export function heading(state) {
  const title =
    state.page === "overview"
      ? "operation"
      : state.page === "analytics"
        ? "analytics"
        : state.page === "guide"
          ? "guideTitle"
          : state.queue === "all"
            ? "tickets"
            : null;
  return `<div class="page-heading"><div><p class="eyebrow">${state.page === "guide" ? "NEXO DESK / WORKSPACE" : new Intl.DateTimeFormat(lang, { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p><h1>${title ? t(title) : queueLabel(state.queue)}</h1><p>${t(state.page === "guide" ? "guideIntro" : state.page === "analytics" ? "analyticsSub" : "subtitle")}</p></div><div class="heading-actions">${state.page === "guide" ? "" : period(state)}${button("newTicket", "new", "plus", "primary")}</div></div>`;
}
const footer = (state) =>
  `<footer class="sync-footer"><span><i class="live-dot"></i>${t("local")} · ${t("lastSync")} ${new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit" }).format(state.syncedAt)}</span><span>NEXO DESK / ${t("demo")}</span></footer>`;
function filterField(state, key, items, label = t) {
  return `<label>${t(key)}<select data-filter="${key}" aria-label="${t(key)}"><option value="">${t("any")}</option>${options(items, state.filters[key], label)}</select></label>`;
}
function ticketElement(state, ticket, card = false) {
  const d = deadline(ticket),
    dueDate = new Intl.DateTimeFormat(lang, {
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(ticket.dueAt));
  const checkbox = `<input type="checkbox" data-select="${ticket.id}" aria-label="${t("selectTicket")} NEX-${ticket.id}" ${state.selected.has(ticket.id) ? "checked" : ""}>`;
  const main = `<button class="ticket-main" data-ticket="${ticket.id}" aria-label="${t("openTicket")} NEX-${ticket.id}: ${e(ticket.title)}"><strong>${e(ticket.title)}</strong><span class="ticket-meta"><span class="mono">NEX-${ticket.id.toString().padStart(3, "0")}</span><span>·</span><span>${e(ticket.requester)}</span></span></button>`;
  const end = `<span class="due-mini ${d}" title="${t(d)} · ${dateTime(ticket.dueAt)}">${isDone(ticket) ? t("completed") : d === "overdue" ? t("overdue") : dueDate}</span>`;
  return card
    ? `<article class="ticket-card ${state.selected.has(ticket.id) ? "selected" : ""}" data-flip-id="ticket-${ticket.id}"><div class="card-top">${checkbox}<span class="mono">NEX-${ticket.id.toString().padStart(3, "0")}</span>${priorityBadge(ticket.priority)}</div>${main}<span class="card-category">${t(ticket.category)}</span><div class="card-foot">${end}${avatar(state, ticket.assigneeId)}</div></article>`
    : `<div class="ticket-row ${state.selected.has(ticket.id) ? "selected" : ""}" data-flip-id="ticket-${ticket.id}">${checkbox}${main}${statusBadge(ticket.status)}${priorityBadge(ticket.priority)}<div class="ticket-end">${avatar(state, ticket.assigneeId)}${end}</div></div>`;
}
export function empty(state) {
  return `<div class="empty">${icon("inbox")}<h3>${t("noResults")}</h3><p>${t(state.summary.total ? "noResultsHint" : "emptyHint")}</p>${button(state.summary.total ? "reset" : "newTicket", state.summary.total ? "reset" : "new", state.summary.total ? "refresh" : "plus")}</div>`;
}
function results(state) {
  if (state.loading)
    return `<div class="loading-lines" role="status" aria-label="${t("loading")}"><div class="loading-line"></div><div class="loading-line"></div><div class="loading-line"></div></div>`;
  if (state.error)
    return `<div class="empty" role="alert">${icon("inbox")}<h3>${t("loadError")}</h3><p>${t(state.error)}</p>${button("retry", "refresh", "refresh")}</div>`;
  if (!state.tickets.length) return empty(state);
  if (state.view === "board")
    return `<div class="board-scroll" role="region" aria-label="${t("board")}" tabindex="0"><div class="board">${STATUSES.map(
      (status) => {
        const tickets = state.tickets.filter((t) => t.status === status);
        return `<section class="board-column"><div class="column-title">${statusBadge(status)}<span>${number(tickets.length)}</span></div>${tickets.map((ticket) => ticketElement(state, ticket, true)).join("") || `<p class="column-empty">${t("noResults")}</p>`}</section>`;
      },
    ).join("")}</div></div>`;
  const start = (state.listPage - 1) * 8,
    visible = state.tickets.slice(start, start + 8);
  return `<div class="table-head"><input type="checkbox" data-select-all aria-label="${t("selectAll")}" ${visible.every((ticket) => state.selected.has(ticket.id)) ? "checked" : ""}><span>${t("tickets")}</span><span>${t("status")}</span><span>${t("priority")}</span><span>${t("assigneeId")} / ${t("deadline")}</span></div><div class="ticket-list">${visible.map((ticket) => ticketElement(state, ticket)).join("")}</div><div class="table-footer"><span>${t("showing")} ${number(start + 1)}–${number(start + visible.length)} ${t("of")} ${number(state.tickets.length)}</span><div class="pagination"><button class="icon-button prev" data-action="prev" aria-label="${t("pagePrev")}" ${state.listPage === 1 ? "disabled" : ""}>${icon("chevron")}</button><span>${state.listPage} / ${Math.ceil(state.tickets.length / 8)}</span><button class="icon-button" data-action="next" aria-label="${t("pageNext")}" ${start + 8 >= state.tickets.length ? "disabled" : ""}>${icon("chevron")}</button></div></div>`;
}
function radar(state) {
  const alerts = state.summary.alerts;
  const total = state.summary.total || 1;
  return `<aside class="radar"><div class="radar-heading"><h3>${t("radar")}</h3>${icon("bolt")}</div><p>${t("radarSub")}</p><div class="radar-visual"><svg viewBox="0 0 150 150" aria-hidden="true"><circle cx="75" cy="75" r="61" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="1 5"/><circle cx="75" cy="75" r="49" fill="none" stroke="currentColor" stroke-width="4"/><circle class="radar-ring" cx="75" cy="75" r="49" fill="none" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(alerts.length / total) * 308} 308"/></svg><div class="radar-count"><strong>${number(alerts.length)}</strong><small>${t("attention")}</small></div></div>${
    alerts
      .slice(0, 3)
      .map(
        (ticket) =>
          `<button class="alert-item" data-ticket="${ticket.id}"><span class="alert-top"><span class="mono muted">NEX-${ticket.id.toString().padStart(3, "0")}</span>${priorityBadge(ticket.priority)}</span><strong>${e(ticket.title)}</strong><span class="alert-bottom">${icon("clock")}${t(deadline(ticket))} · ${dateTime(ticket.dueAt)}</span></button>`,
      )
      .join("") || `<p>${t("noAlerts")}</p>`
  }<button class="text-button" data-action="alerts">${t("seeAlerts")}${icon("arrow")}</button></aside>`;
}
export function workspace(state) {
  return `${heading(state)}${state.page === "overview" ? metrics(state) : ""}<div class="work-grid ${state.hideRadar || state.view === "board" ? "no-radar" : ""}"><section class="queue-panel"><div class="queue-heading"><h2>${t("queueTitle")}<span class="count-chip">${number(state.tickets.length)}</span></h2><div style="display:flex;gap:7px">${iconButton(state.hideRadar ? "unfocus" : "focus", "focus", "eye", "focus-toggle")}<div class="segmented" role="group" aria-label="${t("tickets")}">${["list", "board"].map((v) => `<button class="${state.view === v ? "active" : ""}" data-view="${v}" aria-pressed="${state.view === v}">${icon(v)}${t(v)}</button>`).join("")}</div></div></div><div class="toolbar"><div class="search-field">${icon("search")}<input id="search" type="search" value="${e(state.filters.q)}" placeholder="${t("search")}" aria-label="${t("searchLabel")}"><kbd>/</kbd></div><button class="button ${state.filtersOpen ? "is-on" : ""}" data-action="filters" aria-expanded="${state.filtersOpen}" aria-controls="filters-panel">${icon("filter")}<span>${t("filters")}</span></button>${button("export", "export", "download")}<select class="period-select" data-filter="sort" aria-label="${t("sort")}">${options(["priority", "newest", "oldest", "deadline"], state.filters.sort, (k) => t(k === "priority" ? "byPriority" : k === "deadline" ? "byDeadline" : k))}</select></div><div class="filters-panel" id="filters-panel" ${state.filtersOpen ? "" : "hidden"}>${filterField(state, "status", STATUSES)}${filterField(state, "priority", PRIORITIES, priorityLabel)}${filterField(state, "category", CATEGORIES)}${filterField(
    state,
    "assigneeId",
    state.agents.map((a) => a.id),
    (id) => agentName(state, id),
  )}${filterField(state, "deadline", ["onTime", "soon", "overdue", "completed"])}<button class="text-button" data-action="reset">${t("reset")}</button></div><div class="queue-tabs" role="group" aria-label="${t("queues")}">${["all", "mine", "urgent", "resolved"].map((q) => `<button data-queue="${q}" class="${state.queue === q ? "active" : ""}" aria-pressed="${state.queue === q}">${queueLabel(q)}<span>${number(state.summary.queues[q] || 0)}</span></button>`).join("")}</div><div id="bulk-slot">${bulkBar(state)}</div><div id="results" aria-busy="${state.loading}">${results(state)}</div></section>${state.hideRadar || state.view === "board" ? "" : radar(state)}</div>${footer(state)}`;
}
export function bulkBar(state) {
  return state.selected.size
    ? `<div class="bulk-bar"><span>${t("countSelected", { n: number(state.selected.size) })}</span><div>${button("bulk", "bulk", "edit", "small")}${iconButton("clearSelection", "clear-selection", "close")}</div></div>`
    : "";
}
export function analytics(state) {
  const s = state.summary,
    max = Math.max(1, ...s.trend.flatMap((d) => [d.created, d.resolved]));
  const distribution = (key, title, cls = "") =>
    `<section class="chart-section ${cls}"><div class="chart-header"><div><h2>${t(title)}</h2><p>${t("activeOnly")}</p></div></div><div class="bar-list">${s[key].map((item) => `<div><div class="bar-label"><span>${key === "priorities" ? priorityLabel(item.key) : t(item.key)}</span><strong>${number(item.count)}</strong></div><div class="bar-track"><div class="bar-fill" style="--width:${(item.count / Math.max(1, ...s[key].map((x) => x.count))) * 100}%"></div></div></div>`).join("")}</div></section>`;
  return `${heading(state)}${metrics(state)}<div class="analytics-grid"><section class="chart-section wide"><div class="chart-header"><div><h2>${t("volume")}</h2><p>${t("volumeHint")}</p></div><div class="chart-legend"><span>${t("createdSeries")}</span><span>${t("resolvedSeries")}</span></div></div><div class="trend-chart" role="img" aria-label="${t("volume")}. ${t("chartTable")}.">${s.trend.map((day, i) => `<div class="trend-day" title="${day.date}: ${t("createdSeries")} ${day.created}, ${t("resolvedSeries")} ${day.resolved}"><div class="trend-bar" style="--height:${(day.created / max) * 90}%"></div><div class="trend-bar secondary" style="--height:${(day.resolved / max) * 90}%"></div>${i % Math.ceil(s.days / 7) === 0 || i === s.days - 1 ? `<span class="trend-label">${new Intl.DateTimeFormat(lang, { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(day.date))}</span>` : ""}</div>`).join("")}</div><details class="chart-data"><summary>${t("chartTable")}</summary><table><thead><tr><th>${t("date")}</th><th>${t("createdSeries")}</th><th>${t("resolvedSeries")}</th></tr></thead><tbody>${s.trend.map((d) => `<tr><td>${new Intl.DateTimeFormat(lang, { timeZone: "UTC" }).format(new Date(d.date))}</td><td>${number(d.created)}</td><td>${number(d.resolved)}</td></tr>`).join("")}</tbody></table></details></section>${distribution("priorities", "priorityChart")}${distribution("categories", "categoryChart", "category-chart")}</div>${footer(state)}`;
}
export function guide(state) {
  return `${heading(state)}<div class="guide-layout">${[
    ["guideCreate", "guideCreateText"],
    ["guideFlow", "guideFlowText"],
    ["guideDeadline", "deadlineRule"],
    ["guideUndo", "guideUndoText"],
  ]
    .map(
      ([title, text]) =>
        `<section class="guide-step"><h2>${t(title)}</h2><p>${t(text)}</p></section>`,
    )
    .join(
      "",
    )}<section class="guide-step"><h2>${t("shortcuts")}</h2><div class="shortcut-list">${[
    ["N", "shortcutN"],
    ["/", "shortcutSearch"],
    ["Esc", "shortcutEsc"],
  ]
    .map(
      ([key, label]) => `<div><span>${t(label)}</span><kbd>${key}</kbd></div>`,
    )
    .join(
      "",
    )}</div></section><section class="guide-step"><h2>${t("demoScope")}</h2><p>${t("demoScopeText")}</p><button class="button" type="button" data-action="reset-demo">${t("resetDemo")}</button></section></div>${footer(state)}`;
}
function localDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Date(date - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";
}
export function ticketForm(state, ticket = {}) {
  const data = {
    title: "",
    description: "",
    requester: "",
    email: "",
    category: "software",
    tags: [],
    priority: "normal",
    status: "open",
    assigneeId: 1,
    dueAt: new Date(Date.now() + 48 * 3600000).toISOString(),
    ...ticket,
  };
  const field = (key, control, full = false, hint = "") =>
    `<label class="field ${full ? "full" : ""}"><span id="label-${key}">${t(key)}${key === "tags" ? "" : " *"}</span>${control.replace(`name="${key}"`, `name="${key}" aria-labelledby="label-${key}"`)}<span class="error-text field-error" id="error-${key}"></span>${hint ? `<small>${t(hint)}</small>` : ""}</label>`;
  const input = (key, max, placeholder = "", type = "text") =>
    `<input name="${key}" type="${type}" value="${e(data[key])}" maxlength="${max}" ${key === "tags" ? "" : "required"} aria-describedby="error-${key}" ${placeholder ? `placeholder="${t(placeholder)}"` : ""}>`;
  const select = (key, items, label = t) =>
    `<select name="${key}" aria-describedby="error-${key}">${options(items, data[key], label)}</select>`;
  return `<div class="dialog-head"><div><span class="eyebrow">${ticket.id ? "NEX-" + ticket.id : "NEXO DESK"}</span><h2 id="dialog-title">${t(ticket.id ? "edit" : "newTicket")}</h2><p>${t("createHint")}</p></div>${iconButton("close", "dialog-close", "close")}</div><form id="ticket-form" novalidate><div class="dialog-body"><p class="error-text form-banner" role="alert"></p><div class="form-grid">${field("title", input("title", 140, "titlePlaceholder"), true)}${field("description", `<textarea name="description" rows="4" maxlength="5000" required aria-describedby="error-description" placeholder="${t("descriptionPlaceholder")}">${e(data.description)}</textarea>`, true)}${field("requester", input("requester", 100))}${field("email", input("email", 180, "", "email"))}${field("category", select("category", CATEGORIES))}${field("priority", select("priority", PRIORITIES, priorityLabel))}${field("status", select("status", STATUSES))}${field(
    "assigneeId",
    select(
      "assigneeId",
      state.agents.map((a) => a.id),
      (id) => agentName(state, id),
    ),
  )}${field("dueAt", `<input name="dueAt" type="datetime-local" value="${localDate(data.dueAt)}" required max="2099-12-31T23:59" aria-describedby="error-dueAt">`)}${field("tags", `<input name="tags" value="${e(Array.isArray(data.tags) ? data.tags.join(", ") : data.tags)}" aria-describedby="error-tags" maxlength="128">`, false, "tagsHint")}</div></div><div class="dialog-actions"><button class="button" type="button" data-action="dialog-close">${t("cancel")}</button><button class="button primary" type="submit">${icon("check")}<span>${t("save")}</span></button></div></form>`;
}
const displayValue = (state, field, value) =>
  ["status", "category"].includes(field)
    ? t(value)
    : field === "priority"
      ? priorityLabel(value)
      : field === "assigneeId"
        ? e(agentName(state, value))
        : field === "dueAt"
          ? dateTime(value)
          : Array.isArray(value)
            ? e(value.join(", "))
            : e(value);
export function detail(state, ticket, events, note = "") {
  const meta = (label, value) =>
    `<div><dt>${t(label)}</dt><dd>${value}</dd></div>`;
  return `<div class="dialog-head"><div><span class="eyebrow">NEX-${ticket.id.toString().padStart(3, "0")} · ${t(ticket.category)}</span><h2 id="dialog-title">${e(ticket.title)}</h2></div>${iconButton("close", "dialog-close", "close")}</div><div class="dialog-body"><div style="display:flex;gap:10px;align-items:center">${statusBadge(ticket.status)}${priorityBadge(ticket.priority)}</div><dl class="details-meta">${meta("requester", e(ticket.requester))}${meta("assigneeId", avatar(state, ticket.assigneeId) + " " + e(agentName(state, ticket.assigneeId)))}${meta("email", e(ticket.email))}${meta("deadline", `<span class="due-mini ${deadline(ticket)}">${t(deadline(ticket))}<br>${dateTime(ticket.dueAt)}</span>`)}${meta("createdAt", dateTime(ticket.createdAt))}${meta("updatedAt", dateTime(ticket.updatedAt))}</dl><h3 style="margin-bottom:10px">${t("description")}</h3><p class="detail-description">${e(ticket.description)}</p><div class="tag-list">${ticket.tags.map((tag) => `<span class="tag">${e(tag)}</span>`).join("")}</div><div class="detail-actions">${button("edit", "edit", "edit")}${isDone(ticket) ? button("reopen", "reopen", "undo") : button("resolve", "resolve", "check", "primary")}${ticket.status === "resolved" ? button("closeTicket", "close-ticket", "check") : ""}</div><form class="notes-form" id="note-form" novalidate><label for="note"><span class="note-mark">${t("internalNote")}</span></label><textarea id="note" name="note" maxlength="2000" placeholder="${t("notePlaceholder")}" aria-describedby="note-hint error-note">${e(note)}</textarea><span class="error-text" id="error-note" role="alert"></span><div class="note-form-footer"><p id="note-hint">${t("noteHint")}</p><button class="button small" type="submit">${icon("plus")}${t("addNote")}</button></div></form><h3>${t("history")}</h3><ol class="timeline">${events.map((event) => `<li><div class="timeline-top"><strong>${event.type === "note" ? `<span class="note-mark">${t("internalNote")}</span>` : t(event.type === "undo" ? "undoEvent" : event.type)}</strong><time datetime="${event.createdAt}">${dateTime(event.createdAt)}</time></div>${event.type === "note" ? `<p>${e(event.payload.text)}</p>` : (event.payload.changes || []).map((change) => `<div class="history-change">${t(change.field)}: <del>${displayValue(state, change.field, change.from)}</del> → ${displayValue(state, change.field, change.to)}</div>`).join("")}</li>`).join("")}</ol></div>`;
}
export function bulkForm(state) {
  return `<div class="dialog-head"><div><span class="eyebrow">NEXO DESK</span><h2 id="dialog-title">${t("bulkTitle")}</h2><p>${t("bulkInfo", { n: state.selected.size })}</p></div>${iconButton("close", "dialog-close", "close")}</div><form id="bulk-form"><div class="dialog-body"><p class="error-text form-banner" role="alert"></p><div class="form-grid"><label class="field">${t("status")}<select name="status"><option value="">${t("unchanged")}</option>${options(STATUSES, "")}</select></label><label class="field">${t("assigneeId")}<select name="assigneeId"><option value="">${t("unchanged")}</option>${options(
    state.agents.map((a) => a.id),
    "",
    (id) => agentName(state, id),
  )}</select></label></div></div><div class="dialog-actions"><button type="button" class="button" data-action="dialog-close">${t("cancel")}</button><button class="button primary" type="submit">${t("apply")}</button></div></form>`;
}
export function alertsPanel(state) {
  return `<div class="dialog-head"><div><span class="eyebrow">NEXO DESK</span><h2 id="dialog-title">${t("radar")}</h2><p>${t("alertsInfo")}</p></div>${iconButton("close", "dialog-close", "close")}</div><div class="dialog-body">${state.summary.alerts.map((ticket) => `<button class="alert-item" data-ticket="${ticket.id}"><span class="alert-top"><span class="mono">NEX-${ticket.id}</span>${priorityBadge(ticket.priority)}</span><strong>${e(ticket.title)}</strong><span class="alert-bottom">${t(deadline(ticket))} · ${dateTime(ticket.dueAt)}</span></button>`).join("") || `<p>${t("noAlerts")}</p>`}</div>`;
}
