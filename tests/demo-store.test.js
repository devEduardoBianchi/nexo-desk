import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoStore } from '../public/demo-store.js';

function browserStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

function validTicket() {
  return {
    title: 'Não consigo entrar no portal',
    description: 'A conta retorna um erro ao tentar abrir o painel.',
    requester: 'Pessoa Teste',
    email: 'test@example.com',
    category: 'access',
    tags: ['teste'],
    priority: 'high',
    status: 'open',
    assigneeId: 1,
    dueAt: new Date(Date.now() + 3600000).toISOString(),
  };
}

const change = (method, body) => ({ method, body: JSON.stringify(body) });

test('demo pública mantém dados, histórico e desfazer em cada navegador', () => {
  const firstBrowser = browserStorage();
  const first = createDemoStore(firstBrowser);
  const second = createDemoStore(browserStorage());
  assert.equal(first.request('/tickets').tickets.length, 24);
  assert.equal(second.request('/tickets').tickets.length, 24);

  const { ticket } = first.request('/tickets', change('POST', validTicket()));
  assert.equal(ticket.id, 25);
  assert.equal(second.request('/tickets').tickets.length, 24);
  assert.equal(createDemoStore(firstBrowser).request('/tickets').tickets.length, 25);

  const saved = first.request('/tickets/25', change('PATCH', { status: 'resolved', version: 1 }));
  assert.equal(saved.ticket.status, 'resolved');
  assert.equal(first.request('/tickets/25').events.length, 2);
  const undone = first.request('/undo', change('POST', { token: saved.undoToken }));
  assert.equal(undone.tickets[0].status, 'open');

  const noted = first.request('/tickets/25/notes', change('POST', {
    text: 'Investigação iniciada.', version: undone.tickets[0].version,
  }));
  assert.equal(first.request('/tickets/25').events[0].type, 'note');
  assert.equal(noted.ticket.version, undone.tickets[0].version + 1);
});

test('filtros, lote, CSV e reinício usam apenas a cópia local', () => {
  const demo = createDemoStore(browserStorage());
  const original = demo.request('/tickets/1').ticket;
  const second = demo.request('/tickets/2').ticket;
  const result = demo.request('/bulk', change('POST', {
    ids: [1, 2],
    versions: { 1: original.version, 2: second.version },
    changes: { status: 'resolved' },
  }));
  assert.equal(demo.request('/tickets?status=resolved').tickets.length,
    6 + 2);
  assert.equal(result.tickets.length, 2);
  assert.equal(demo.request('/summary?days=7').total, 24);
  assert.match(demo.csv(new URLSearchParams({ q: original.title }), 'en'), /"NEX-001"/);
  demo.request('/undo', change('POST', { token: result.undoToken }));
  assert.equal(demo.request('/tickets/1').ticket.status, original.status);
  demo.reset();
  assert.equal(demo.request('/tickets').tickets.length, 24);
  assert.equal(demo.request('/tickets/1').ticket.version, 1);
});

test('validação e conflito não modificam os dados locais', () => {
  const demo = createDemoStore(browserStorage());
  assert.throws(() => demo.request('/tickets', change('POST', {
    ...validTicket(), email: 'inválido',
  })), error => error.code === 'validation' && error.fields.email === 'emailInvalid');
  assert.throws(() => demo.request('/tickets/1', change('PATCH', {
    priority: 'urgent', version: 0,
  })), error => error.code === 'conflict');
  assert.equal(demo.request('/tickets').tickets.length, 24);
});
