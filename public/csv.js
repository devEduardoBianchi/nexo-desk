const columns=[
  ['id','ID','ID'],['title','Título','Title'],['description','Descrição','Description'],
  ['requester','Solicitante','Requester'],['email','E-mail','Email'],['category','Categoria','Category'],
  ['tags','Etiquetas','Tags'],['priority','Prioridade','Priority'],['status','Status','Status'],
  ['assigneeId','Responsável','Assignee'],['createdAt','Criado em','Created at'],
  ['updatedAt','Atualizado em','Updated at'],['dueAt','Prazo','Due date']
];
const names={
  pt:{open:'Aberto',progress:'Em atendimento',waiting:'Aguardando retorno',resolved:'Resolvido',closed:'Encerrado',low:'Baixa',normal:'Normal',high:'Alta',urgent:'Urgente',access:'Acessos',software:'Software',hardware:'Hardware',network:'Rede',other:'Outro'},
  en:{open:'Open',progress:'In progress',waiting:'Waiting',resolved:'Resolved',closed:'Closed',low:'Low',normal:'Normal',high:'High',urgent:'Urgent',access:'Access',software:'Software',hardware:'Hardware',network:'Network',other:'Other'}
};
const cell=value=>{
  let text=String(value??'');
  if(/^[\s]*[=+\-@\t\r\n]/.test(text))text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
};

export function toCsv(tickets,agents,language='pt'){
  const locale=language==='en'?'en':'pt';
  const agentNames=new Map(agents.map(agent=>[agent.id,agent.name]));
  const rows=[columns.map(([,pt,en])=>cell(locale==='en'?en:pt)).join(';')];
  for(const ticket of tickets){
    rows.push(columns.map(([key])=>{
      const value=ticket[key];
      if(key==='id')return cell('NEX-'+String(value).padStart(3,'0'));
      if(key==='assigneeId')return cell(agentNames.get(value)||'');
      if(key==='tags')return cell(value.join(', '));
      if(['category','priority','status'].includes(key))return cell(names[locale][value]||value);
      return cell(value);
    }).join(';'));
  }
  return '\ufeff'+rows.join('\r\n');
}
