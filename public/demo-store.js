import { isDone, validateTicket } from './domain.js';
import { DEMO_AGENTS, DEMO_NOTE, demoTickets } from './demo-data.js';
import { listTickets, summarizeTickets } from './query.js';
import { toCsv } from './csv.js';

const KEY = 'nexo-public-demo-v1';
const fields = ['title', 'description', 'requester', 'email', 'category', 'tags', 'priority', 'status', 'assigneeId', 'dueAt'];
const agents = DEMO_AGENTS.map(([id, name, initials]) => ({ id, name, initials }));
const copy = value => structuredClone(value);
const fail = (code, fields) => { throw { code, fields }; };

function seed() {
  const data = { tickets: [], events: [], undos: [], nextTicketId: 1, nextEventId: 1 };
  for (const { input, date, noteAt } of demoTickets()) {
    const ticket = {
      ...copy(input), id: data.nextTicketId++, createdAt: date, updatedAt: date,
      resolvedAt: isDone(input) ? date : null, version: 1,
    };
    data.tickets.push(ticket);
    addEvent(data, ticket.id, 'created', {}, date);
    if (noteAt) addEvent(data, ticket.id, 'note', { text: DEMO_NOTE }, noteAt);
  }
  return data;
}

function addEvent(data, ticketId, type, payload, date = new Date().toISOString()) {
  data.events.push({ id: data.nextEventId++, ticketId, type, payload, createdAt: date });
}

function valid(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('invalidRequest');
  const errors = validateTicket(input, agents);
  if (Object.keys(errors).length) fail('validation', errors);
  return Object.fromEntries(fields.map(key => [key, typeof input[key] === 'string' ? input[key].trim() : copy(input[key])]));
}

function find(data, id) {
  const ticket = data.tickets.find(item => item.id === id);
  if (!ticket) fail('notFound');
  return ticket;
}

function updateOne(data, old, changes, undo = false) {
  const next = valid({ ...old, ...changes });
  const changed = fields.filter(key => JSON.stringify(old[key]) !== JSON.stringify(next[key]))
    .map(field => ({ field, from: old[field], to: next[field] }));
  if (!changed.length) return old;
  const date = new Date().toISOString();
  const updated = {
    ...old, ...next, updatedAt: date, version: old.version + 1,
    resolvedAt: undo ? changes.resolvedAt : isDone(next) ? old.resolvedAt || date : null,
  };
  data.tickets[data.tickets.findIndex(ticket => ticket.id === old.id)] = updated;
  addEvent(data, old.id, undo ? 'undo' : 'updated', { changes: changed }, date);
  return updated;
}

function remember(data, originals, updated) {
  data.undos = data.undos.filter(item => item.expiresAt >= Date.now());
  const token = crypto.randomUUID();
  data.undos.push({
    token, expiresAt: Date.now() + 60000,
    snapshots: originals.map((ticket, index) => ({ ticket, version: updated[index].version })),
  });
  return token;
}

function parseBody(options) {
  try {
    return options.body ? JSON.parse(options.body) : {};
  } catch {
    fail('invalidRequest');
  }
}

export function createDemoStore(storage) {
  if (storage === undefined) {
    try { storage = globalThis.localStorage; } catch { storage = null; }
  }
  let memory;
  function read() {
    let saved;
    try { saved = storage?.getItem(KEY); } catch { /* Private browsing may disable storage. */ }
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (Array.isArray(data.tickets) && Array.isArray(data.events) && Array.isArray(data.undos) &&
          Number.isSafeInteger(data.nextTicketId) && Number.isSafeInteger(data.nextEventId)) {
          memory = data;
          return data;
        }
      } catch { /* A malformed local snapshot is replaced with fictional seed data. */ }
    }
    if (!memory) memory = seed();
    try { storage?.setItem(KEY, JSON.stringify(memory)); } catch { /* In-memory demo still works. */ }
    return copy(memory);
  }
  function write(data) {
    try { storage?.setItem(KEY, JSON.stringify(data)); }
    catch { fail('storageFull'); }
    memory = data;
  }
  function request(path, options = {}) {
    const method = options.method || 'GET';
    const url = new URL(path, 'https://demo.invalid');
    const data = read();
    const body = method === 'GET' ? {} : parseBody(options);
    const parts = url.pathname.split('/').filter(Boolean);
    const id = Number(parts[1]);
    if (method === 'GET' && url.pathname === '/meta')
      return { agents: copy(agents), currentAgentId: 1, demo: true };
    if (method === 'GET' && url.pathname === '/summary')
      return summarizeTickets(data.tickets, url.searchParams.get('days'));
    if (method === 'GET' && url.pathname === '/tickets')
      return { tickets: listTickets(data.tickets, Object.fromEntries(url.searchParams)) };
    if (parts[0] === 'tickets' && Number.isSafeInteger(id) && id > 0) {
      if (method === 'GET' && parts.length === 2) {
        return {
          ticket: copy(find(data, id)),
          events: data.events.filter(item => item.ticketId === id).sort((a, b) => b.id - a.id),
        };
      }
      if (method === 'PATCH' && parts.length === 2) {
        const old = find(data, id);
        if (body.version !== old.version) fail('conflict');
        const ticket = updateOne(data, old, body);
        const undoToken = ticket.version !== old.version ? remember(data, [old], [ticket]) : null;
        write(data);
        return { ticket, undoToken };
      }
      if (method === 'POST' && parts[2] === 'notes' && parts.length === 3) {
        if (typeof body.text !== 'string' || !body.text.trim() || body.text.trim().length > 2000)
          fail('validation', { note: 'noteInvalid' });
        const old = find(data, id);
        if (body.version !== old.version) fail('conflict');
        addEvent(data, id, 'note', { text: body.text.trim() });
        const ticket = { ...old, updatedAt: new Date().toISOString(), version: old.version + 1 };
        data.tickets[data.tickets.findIndex(item => item.id === id)] = ticket;
        write(data);
        return { ticket };
      }
    }
    if (method === 'POST' && url.pathname === '/tickets') {
      const input = valid(body);
      const date = new Date().toISOString();
      const ticket = {
        ...input, id: data.nextTicketId++, createdAt: date, updatedAt: date,
        resolvedAt: isDone(input) ? date : null, version: 1,
      };
      data.tickets.push(ticket);
      addEvent(data, ticket.id, 'created', {});
      write(data);
      return { ticket };
    }
    if (method === 'POST' && url.pathname === '/bulk') {
      const ids = body.ids;
      if (!Array.isArray(ids) || !ids.length || ids.length > 100 ||
        ids.some(value => !Number.isInteger(value)) || new Set(ids).size !== ids.length ||
        !body.changes || typeof body.changes !== 'object' || Array.isArray(body.changes) ||
        !Object.keys(body.changes).length ||
        Object.keys(body.changes).some(key => !['status', 'assigneeId'].includes(key)))
        fail('invalidRequest');
      const originals = ids.map(ticketId => {
        const ticket = find(data, ticketId);
        if (body.versions?.[ticketId] !== ticket.version) fail('conflict');
        return copy(ticket);
      });
      const tickets = originals.map(ticket => updateOne(data, ticket, body.changes));
      const undoToken = remember(data, originals, tickets);
      write(data);
      return { tickets, undoToken };
    }
    if (method === 'POST' && url.pathname === '/undo') {
      const record = data.undos.find(item => item.token === body.token);
      if (!record || record.expiresAt < Date.now()) fail('undoExpired');
      if (record.snapshots.some(({ ticket, version }) => find(data, ticket.id).version !== version))
        fail('conflict');
      const tickets = record.snapshots.map(({ ticket }) =>
        updateOne(data, find(data, ticket.id), ticket, true));
      data.undos = data.undos.filter(item => item !== record);
      write(data);
      return { tickets };
    }
    fail('notFound');
  }
  function csv(query, language) {
    const data = read();
    return toCsv(listTickets(data.tickets, Object.fromEntries(query)), agents, language);
  }
  function reset() {
    const data = seed();
    write(data);
  }
  return { request, csv, reset };
}
