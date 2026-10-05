import { CATEGORIES } from '../public/domain.js';

export const DEMO_AGENTS = [
  [1, 'Alex Morgan', 'AM'],
  [2, 'Camila Torres', 'CT'],
  [3, 'Lucas Martins', 'LM'],
  [4, 'Sofia Costa', 'SC'],
];

export const DEMO_NOTE = 'Triagem iniciada. Vamos verificar o comportamento no ambiente de demonstração.';

export function demoTickets(now = Date.now()) {
  const titles = [
    'VPN desconectando durante reuniões', 'Acesso ao painel financeiro',
    'Impressora do escritório offline', 'Erro ao exportar relatório mensal',
    'Configuração de novo notebook', 'Permissão para pasta compartilhada',
    'Aplicativo fecha ao anexar arquivo', 'Instabilidade no Wi-Fi da sala 02',
    'Recuperação de acesso à conta', 'Monitor externo sem imagem',
    'Atualização do software de projetos', 'Integração do calendário',
    'Lentidão ao carregar o CRM', 'Troca de teclado do atendimento',
    'Configuração de assinatura de e-mail', 'Falha na sincronização de arquivos',
    'Acesso ao ambiente de homologação', 'Áudio não funciona nas chamadas',
    'Revisão de permissões da equipe', 'Instalação de ferramenta de design',
    'Rede indisponível na recepção', 'Erro na autenticação do portal',
    'Configuração de backup local', 'Onboarding de nova pessoa',
  ];
  const people = ['Marina Alves', 'Rafael Lima', 'Beatriz Melo', 'Pedro Rocha', 'Julia Santos', 'Daniel Souza'];
  return titles.map((title, index) => {
    const date = new Date(now - (index % 12) * 86400000 - 3600000).toISOString();
    return {
      date,
      noteAt: index % 3 === 0 ? new Date(Date.parse(date) + 1800000).toISOString() : null,
      input: {
        title,
        description: `Solicitação de demonstração: ${title.toLowerCase()}. A equipe precisa de uma análise e orientação para continuar suas atividades. Dados fictícios para explorar o Nexo Desk.`,
        requester: people[index % people.length],
        email: `pessoa${index + 1}@example.com`,
        category: CATEGORIES[index % CATEGORIES.length],
        tags: [['equipe', 'remoto', 'escritório'][index % 3]],
        priority: ['urgent', 'high', 'normal', 'low'][index % 4],
        status: ['open', 'progress', 'waiting', 'open', 'progress', 'resolved', 'closed', 'resolved'][index % 8],
        assigneeId: index % 4 + 1,
        dueAt: new Date(now + [-12, 8, 40, 72, 16, -4, 96, 24][index % 8] * 3600000).toISOString(),
      },
    };
  });
}
