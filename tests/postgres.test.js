import test from 'node:test';
import assert from 'node:assert/strict';
import { DataType, newDb } from 'pg-mem';
import { createApp } from '../server/index.js';
import { createPostgresStore } from '../server/postgres.js';

function valid() {
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

function createMemoryStore() {
  const memory = newDb({ noAstCoverageCheck: true });
  memory.public.registerFunction({
    name: 'pg_advisory_xact_lock',
    args: [DataType.integer],
    returns: DataType.integer,
    implementation: () => 1,
  });
  const { Pool } = memory.adapters.createPg();
  const pool = new Pool();
  return { pool, store: createPostgresStore({ pool }) };
}

test('PostgreSQL semeia a demo e preserva edição, histórico e desfazer', async () => {
  const { pool, store } = createMemoryStore();
  try {
    await store.ready();
    assert.equal((await store.agents()).length, 4);
    assert.equal((await store.all()).length, 24);
    const created = await store.insert(valid());
    assert.equal(created.id, 25);
    assert.equal((await store.history(created.id))[0].type, 'created');
    const changed = await store.update(created.id, { status: 'progress', version: created.version });
    assert.equal(changed.ticket.status, 'progress');
    assert.ok(changed.undoToken);
    const undone = await store.undo(changed.undoToken);
    assert.equal(undone.tickets[0].status, 'open');
    const noted = await store.note(created.id, 'Investigação iniciada.', undone.tickets[0].version);
    assert.equal((await store.history(created.id))[0].type, 'note');
    assert.equal(noted.version, undone.tickets[0].version + 1);
    assert.equal((await store.summary()).total, 25);
    const next = await store.insert(valid());
    const bulk = await store.bulk({ ids: [created.id, next.id], versions: { [created.id]: noted.version, [next.id]: next.version }, changes: { status: 'resolved' } });
    assert.equal(bulk.tickets.length, 2);
    assert.ok(bulk.tickets.every(ticket => ticket.status === 'resolved'));
    assert.ok((await store.undo(bulk.undoToken)).tickets.every(ticket => ticket.status === 'open'));
    const secondInstance = createPostgresStore({ pool });
    await secondInstance.ready();
    assert.equal((await secondInstance.all()).length, 26);
  } finally {
    await pool.end();
  }
});

test('API Express responde com a implementação PostgreSQL assíncrona', async () => {
  const { pool, store } = createMemoryStore();
  const app = createApp(store);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const meta = await fetch(base + '/api/meta');
    assert.equal(meta.status, 200);
    assert.equal((await meta.json()).agents.length, 4);
    assert.equal((await (await fetch(base + '/api/tickets')).json()).tickets.length, 24);
    const response = await fetch(base + '/api/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(valid()) });
    assert.equal(response.status, 201);
    const { ticket } = await response.json();
    assert.equal((await (await fetch(base + `/api/tickets/${ticket.id}`)).json()).events.length, 1);
    const csv = await fetch(base + '/api/tickets.csv?lang=en');
    assert.equal(csv.status, 200);
    assert.match(await csv.text(), /NEX-025/);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await pool.end();
  }
});
