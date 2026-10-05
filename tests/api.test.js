import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../server/database.js';
import { createApp } from '../server/index.js';
import { toCsv } from '../server/csv.js';
import { deadline } from '../public/domain.js';

const valid=()=>({title:'Não consigo entrar no portal',description:'A conta retorna um erro ao tentar abrir o painel.',requester:'Pessoa Teste',email:'test@example.com',category:'access',tags:['teste'],priority:'high',status:'open',assigneeId:1,dueAt:new Date(Date.now()+3600000).toISOString()});

test('criação, edição, notas, encerramento e reabertura preservam o histórico',()=>{
 const store=createStore(':memory:',false);try{
 const ticket=store.insert(valid());assert.equal(ticket.id,1);
 const changed=store.update(ticket.id,{status:'resolved',assigneeId:2,priority:'urgent',version:1}).ticket;
 assert.ok(changed.resolvedAt);assert.equal(deadline(changed),'completed');
 const closed=store.update(1,{status:'closed',version:changed.version}).ticket;
 const reopened=store.update(1,{status:'open',version:closed.version}).ticket;assert.equal(reopened.resolvedAt,null);
 store.note(1,'Investigação interna registrada.',reopened.version);
 const history=store.history(1);assert.equal(history.length,5);assert.equal(history[0].type,'note');
 assert.equal(history.at(-2).payload.changes.length,3);
 }finally{store.db.close();}
});
test('desfazer é persistente e não sobrescreve uma edição ou nota posterior',()=>{
 const dir=mkdtempSync(join(tmpdir(),'nexo-test-')),file=join(dir,'test.sqlite');let store=createStore(file,false);
 try{
 const original=store.insert(valid());const change=store.update(1,{priority:'urgent',version:original.version});store.db.close();store=createStore(file,false);
 store.undo(change.undoToken);assert.equal(store.get(1).priority,'high');assert.equal(store.history(1)[0].type,'undo');
 const next=store.update(1,{status:'progress',version:store.get(1).version});store.note(1,'Nota posterior.',store.get(1).version);
 assert.throws(()=>store.undo(next.undoToken),err=>err.code==='conflict');assert.equal(store.get(1).status,'progress');
 }finally{store.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('operação em lote é atômica e o desfazer restaura todos',()=>{
 const store=createStore(':memory:',false);try{
 const a=store.insert(valid()),b=store.insert(valid());
 assert.throws(()=>store.bulk({ids:[a.id,b.id],versions:{1:1,2:0},changes:{status:'closed'}}),err=>err.code==='conflict');assert.equal(store.get(1).status,'open');
 const result=store.bulk({ids:[1,2],versions:{1:1,2:1},changes:{status:'progress',assigneeId:3}});
 assert.equal(store.get(2).assigneeId,3);store.undo(result.undoToken);assert.equal(store.get(1).status,'open');assert.equal(store.get(2).assigneeId,1);
 }finally{store.db.close();}
});
test('validação no servidor rejeita dados inválidos sem gravar',()=>{
 const store=createStore(':memory:',false);try{
 for(const patch of [{title:'a'},{email:'invalid'},{assigneeId:100},{status:'fake'},{priority:'wrong'},{category:'unknown'},{tags:Array(6).fill('a')},{dueAt:'not-a-date'}])assert.throws(()=>store.insert({...valid(),...patch}),err=>err.code==='validation');
 assert.equal(store.all().length,0);
 const ticket=store.insert({...valid(),title:"Teste '); DROP TABLE tickets; --"});assert.ok(store.get(ticket.id));
 }finally{store.db.close();}
});
test('filas e indicadores vêm dos mesmos dados e excluem concluídos dos alertas',()=>{
 const store=createStore(':memory:',false);try{
 store.insert({...valid(),priority:'urgent',dueAt:new Date(Date.now()-1000).toISOString()});
 const done=store.insert({...valid(),status:'resolved',priority:'urgent',dueAt:new Date(Date.now()-1000).toISOString()});
 store.insert({...valid(),assigneeId:2});
 assert.equal(store.list({queue:'overdue'}).length,1);assert.equal(store.list({queue:'mine'}).length,1);assert.equal(store.list({queue:'resolved'})[0].id,done.id);
 const s=store.summary(7);assert.equal(s.total,3);assert.equal(s.resolved,1);assert.equal(s.overdue,1);assert.equal(s.alerts.length,2);assert.equal(s.categories.reduce((n,c)=>n+c.count,0),2);
 assert.equal(store.list({q:'portal',priority:'urgent',status:'resolved'}).length,1);
 }finally{store.db.close();}
});
test('limites exatos de prazo',()=>{
 const now=Date.now(),ticket={status:'open'};
 assert.equal(deadline({...ticket,dueAt:new Date(now-1).toISOString()},now),'overdue');
 assert.equal(deadline({...ticket,dueAt:new Date(now+24*3600000).toISOString()},now),'soon');
 assert.equal(deadline({...ticket,dueAt:new Date(now+24*3600000+1).toISOString()},now),'onTime');
 assert.equal(deadline({status:'closed',dueAt:new Date(now-1).toISOString()},now),'completed');
});

test('CSV usa idioma, filtro e neutraliza fórmulas de planilha',()=>{
 const store=createStore(':memory:',false);try{
  store.insert({...valid(),title:'=SUM(1,2)',status:'open'});
  const exported=toCsv(store.list({status:'open'}),store.agents(),'en');
  assert.ok(exported.startsWith('\ufeff"ID";"Title"'));
  assert.match(exported,/"'=SUM\(1,2\)"/);
  assert.match(exported,/"NEX-001"/);
  assert.match(exported,/"Open"/);
 }finally{store.db.close();}
});
test('API HTTP valida origem, campos, versões e códigos de resposta',async()=>{
 const store=createStore(':memory:',false),app=createApp(store),server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const request=(path,method,body,headers={})=>fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',...headers},body:body?JSON.stringify(body):undefined});
 try{
 assert.equal((await request('/tickets','POST',valid(),{Origin:'https://untrusted.example'})).status,403);
 const invalid=await request('/tickets','POST',{...valid(),email:'bad'});assert.equal(invalid.status,422);assert.equal((await invalid.json()).fields.email,'emailInvalid');
 const created=await request('/tickets','POST',valid());assert.equal(created.status,201);
 assert.equal((await request('/tickets/1','PATCH',{status:'closed',version:0})).status,409);
 assert.equal((await request('/tickets/999','GET')).status,404);
 const response=await request('/tickets/1','GET');assert.equal((await response.json()).events.length,1);
 const csv=await request('/tickets.csv?lang=pt&status=open','GET');assert.equal(csv.status,200);
 assert.match(csv.headers.get('content-disposition'),/attachment/);
 assert.match(await csv.text(),/"NEX-001"/);
 assert.ok(response.headers.get('content-security-policy').includes("default-src 'self'"));
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.db.close();}
});
