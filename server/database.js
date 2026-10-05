import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { validateTicket, isDone } from '../public/domain.js';
import { DEMO_AGENTS, DEMO_NOTE, demoTickets } from './demo-data.js';
import { listTickets, summarizeTickets } from './query.js';

export function createStore(filename = resolve('data/nexo.sqlite'), seed = true) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS agents(id INTEGER PRIMARY KEY, name TEXT NOT NULL, initials TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS tickets(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT NOT NULL,
      requester TEXT NOT NULL, email TEXT NOT NULL, category TEXT NOT NULL, tags TEXT NOT NULL,
      priority TEXT NOT NULL, status TEXT NOT NULL, assigneeId INTEGER NOT NULL REFERENCES agents(id),
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, dueAt TEXT NOT NULL, resolvedAt TEXT, version INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT, ticketId INTEGER NOT NULL REFERENCES tickets(id),
      type TEXT NOT NULL, payload TEXT NOT NULL, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS undos(token TEXT PRIMARY KEY, snapshots TEXT NOT NULL, expiresAt INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS events_ticket ON events(ticketId, id);`);
  const agents = () => db.prepare('SELECT * FROM agents ORDER BY id').all();
  if (!agents().length) {
    for (const [id, name, initials] of DEMO_AGENTS) db.prepare('INSERT INTO agents VALUES(?,?,?)').run(id,name,initials);
  }
  const decode = row => row ? { ...row, tags: JSON.parse(row.tags) } : null;
  const get = id => decode(db.prepare('SELECT * FROM tickets WHERE id=?').get(id));
  const all = () => db.prepare('SELECT * FROM tickets ORDER BY id DESC').all().map(decode);
  const event = (id, type, payload, date = new Date().toISOString()) => db.prepare('INSERT INTO events(ticketId,type,payload,createdAt) VALUES(?,?,?,?)').run(id,type,JSON.stringify(payload),date);
  const fail = (code, status = 400, fields) => { throw Object.assign(new Error(code), { code, status, fields }); };
  const transaction = fn => { db.exec('BEGIN IMMEDIATE'); try { const value = fn(); db.exec('COMMIT'); return value; } catch (e) { db.exec('ROLLBACK'); throw e; } };
  const fields = ['title','description','requester','email','category','tags','priority','status','assigneeId','dueAt'];
  function validated(data) {
    if(!data||typeof data!=='object'||Array.isArray(data))fail('invalidRequest');
    const errors = validateTicket(data, agents());
    if (Object.keys(errors).length) fail('validation',422,errors);
    return Object.fromEntries(fields.map(k => [k, typeof data[k] === 'string' ? data[k].trim() : data[k]]));
  }
  function insert(data, date = new Date().toISOString()) {
    data = validated(data);
    const id = Number(db.prepare(`INSERT INTO tickets(${fields.join(',')},createdAt,updatedAt,resolvedAt) VALUES(${Array(13).fill('?').join(',')})`).run(...fields.map(k=>k==='tags'?JSON.stringify(data[k]):data[k]),date,date,isDone(data)?date:null).lastInsertRowid);
    event(id,'created',{},date); return get(id);
  }
  function updateOne(old, input, undo = false) {
    const next = validated({...old,...input});
    const changes = fields.filter(k=>JSON.stringify(old[k])!==JSON.stringify(next[k])).map(field=>({field,from:old[field],to:next[field]}));
    if (!changes.length) return old;
    const date = new Date().toISOString();
    const resolvedAt = undo ? input.resolvedAt : isDone(next) ? old.resolvedAt || date : null;
    db.prepare(`UPDATE tickets SET ${fields.map(k=>k+'=?').join(',')}, updatedAt=?,resolvedAt=?,version=version+1 WHERE id=?`).run(...fields.map(k=>k==='tags'?JSON.stringify(next[k]):next[k]),date,resolvedAt,old.id);
    event(old.id,undo?'undo':'updated',{changes}); return get(old.id);
  }
  function remember(snapshots, updated) {
    db.prepare('DELETE FROM undos WHERE expiresAt < ?').run(Date.now());
    const token = randomUUID();
    db.prepare('INSERT INTO undos VALUES(?,?,?)').run(token,JSON.stringify(snapshots.map((ticket,i)=>({ticket,version:updated[i].version}))),Date.now()+60000);
    return token;
  }
  function update(id, input) {
    return transaction(()=>{
      const old=get(id); if(!old) fail('notFound',404);
      if(input.version!==old.version) fail('conflict',409);
      const ticket=updateOne(old,input);
      return {ticket,undoToken: ticket.version!==old.version ? remember([old],[ticket]) : null};
    });
  }
  function bulk(body) {
    const ids=body.ids;
    if(!Array.isArray(ids)||!ids.length||ids.length>100||ids.some(x=>!Number.isInteger(x))||new Set(ids).size!==ids.length) fail('invalidRequest');
    if(!body.changes||typeof body.changes!=='object'||Object.keys(body.changes).some(k=>!['status','assigneeId'].includes(k))||!Object.keys(body.changes).length) fail('invalidRequest');
    return transaction(()=>{
      const snapshots=ids.map(id=>{const t=get(id);if(!t) fail('notFound',404);if(body.versions?.[id]!==t.version) fail('conflict',409);return t;});
      const tickets=snapshots.map(t=>updateOne(t,body.changes));
      return {tickets,undoToken:remember(snapshots,tickets)};
    });
  }
  function undo(token) {
    return transaction(()=>{
      const record=db.prepare('SELECT * FROM undos WHERE token=?').get(token);
      if(!record||record.expiresAt<Date.now()) fail('undoExpired',409);
      const snapshots=JSON.parse(record.snapshots);
      if(snapshots.some(s=>get(s.ticket.id)?.version!==s.version)) fail('conflict',409);
      const tickets=snapshots.map(s=>updateOne(get(s.ticket.id),s.ticket,true));
      db.prepare('DELETE FROM undos WHERE token=?').run(token); return {tickets};
    });
  }
  function note(id,text,version) {
    if(typeof text!=='string'||!text.trim()||text.trim().length>2000) fail('validation',422,{note:'noteInvalid'});
    return transaction(()=>{
      const ticket=get(id);if(!ticket)fail('notFound',404);if(version!==ticket.version)fail('conflict',409);
      event(id,'note',{text:text.trim()});
      db.prepare('UPDATE tickets SET updatedAt=?,version=version+1 WHERE id=?').run(new Date().toISOString(),id);
      return get(id);
    });
  }
  const list = (query={}) => listTickets(all(),query);
  const summary = (period=7) => summarizeTickets(all(),period);
  if(seed&&!all().length) transaction(()=>{
    for(const {input,date,noteAt} of demoTickets()) {
      const ticket=insert(input,date);
      if(noteAt)event(ticket.id,'note',{text:DEMO_NOTE},noteAt);
    }
  });
  return {db,agents,get,all,list,summary,insert:data=>transaction(()=>insert(data)),update,bulk,undo,note,
    history:id=>db.prepare('SELECT * FROM events WHERE ticketId=? ORDER BY id DESC').all(id).map(e=>({...e,payload:JSON.parse(e.payload)}))};
}
