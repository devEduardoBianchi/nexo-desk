# Nexo Desk

Sistema de chamados para suporte técnico criado como projeto de portfólio. A interface tem português e inglês, temas claro e escuro e animações com GSAP. A versão pública é um site estático: cada visitante experimenta sua própria cópia de dados fictícios, salva somente no navegador.

![Visão geral do Nexo Desk em tema escuro](docs/preview-desktop.png)

## Como executar

Para ver a mesma versão que será publicada, instale as dependências, prepare os arquivos estáticos e sirva a pasta `public/`. No terminal, dentro desta pasta:

```bash
npm install
npm run build
py -3 -m http.server 3333 --directory public
```

Abra **http://127.0.0.1:3333**. O servidor HTTP aqui serve apenas os arquivos estáticos; a interface não chama uma API. Para executar os testes, use `npm test`.

Na primeira visita, o navegador cria 24 chamados e quatro responsáveis fictícios. Suas alterações persistem naquele navegador até limpar os dados do site ou usar **Reiniciar demonstração** no guia. Outra pessoa recebe uma cópia independente. Evite inserir informações reais, mesmo em uma demo local.

## O que funciona

- Criar, editar, consultar, buscar, filtrar e ordenar chamados; alternar entre lista paginada e quadro por status.
- Filas de demonstração: minha fila, urgentes, vencendo em breve, atrasados e resolvidos. “Minha fila” usa Alex Morgan como responsável de demonstração.
- Status, prioridades, categorias, etiquetas, responsável e prazo; histórico de alterações e notas internas.
- Fechar e reabrir chamados. Notas internas permanecem neste sistema; nenhum e-mail é enviado.
- Selecionar vários chamados para alterar status ou responsável, com confirmação antes de aplicar.
- Desfazer edições de campos e ações em lote por até 60 segundos, desde que você não tenha alterado os registros novamente. Criação e notas não entram no desfazer.
- Indicadores calculados a partir dos chamados deste navegador e gráficos de volume, prioridade e categoria; período de 7, 30 ou 90 dias para resoluções e fluxo diário.
- Alertas locais para urgentes e prazos próximos; exportação CSV dos resultados filtrados com proteção contra fórmulas em células.
- Idioma PT-BR/EN, tema claro/escuro e chamados mantidos no navegador. Chamados e notas permanecem no idioma em que foram escritos. Datas e números seguem o idioma escolhido.
- Atalhos `N` (novo), `/` (busca) e `Esc` (fechar painel), com proteção para quem estiver digitando. Rascunhos de formulários e notas são guardados na sessão do navegador.

Os prazos usam horas corridas: **em dia** quando faltam mais de 24 horas, **vencendo em breve** quando faltam até 24 horas e **atrasado** quando o prazo passou. Chamados resolvidos ou fechados aparecem como concluídos e saem dos alertas. Os alertas são recalculados ao atualizar os dados; não são notificações externas.

## Estrutura

```text
public/         Site estático publicado na Vercel
  app.js        Estado, navegação, formulários e operações da demo local
  demo-store.js Dados isolados no navegador, validação, histórico e desfazer
  demo-data.js  Dados fictícios iniciais
  query.js      Filtros e indicadores
  csv.js        Exportação CSV localizada e segura para planilhas
  views.js      Telas e componentes de interface
  i18n.js       Traduções e formatação
  motion.js     GSAP: timeline, Flip, ScrollTrigger, DrawSVG e CustomEase
  domain.js     Regras compartilhadas de validação e prazo
server/         Implementação Express/SQLite/PostgreSQL preservada para desenvolvimento; não publicada na Vercel
scripts/        Preparação dos arquivos públicos do GSAP
tests/          Verificações de API e regras de negócio
docs/           Capturas de tela para apresentação
data/           Banco local criado automaticamente (ignorado pelo Git)
vercel.json     Configuração estática: publica apenas public/
```

A versão pública não expõe `/api`, não requer `DATABASE_URL` e não envia chamados para um servidor. O código do servidor continua no repositório como referência de desenvolvimento, sem ser incluído nos arquivos servidos. O navegador usa as mesmas regras de validação, filtros, indicadores e CSV para a demonstração.

## Direção visual e movimento

O Nexo Desk usa uma área operacional compacta com marca grafite e verde-lima. As referências visuais fornecidas foram [Carmed](https://carmed-bay.vercel.app/) e [Solid Tech](https://www.solidtech.digital/), usadas para estudar ritmo, hierarquia e movimento. Os componentes, textos e identidade são próprios. A composição dos campos, diálogos e estados toma como referência padrões de [shadcn/ui](https://ui.shadcn.com/docs/components), implementados com controles HTML nativos para preservar a arquitetura sem framework.

GSAP coordena a entrada inicial, a passagem entre lista e quadro (`Flip`), a abertura de detalhes, o destaque dos gráficos com `ScrollTrigger`, traços SVG com `DrawSVGPlugin` e uma curva de animação com `CustomEase`. As animações de conteúdo são removidas quando o sistema detecta `prefers-reduced-motion: reduce`; sem GSAP, o conteúdo e os controles continuam visíveis e funcionais.

## Publicar uma demonstração na Vercel

1. Importe o repositório `nexo-desk` na Vercel com a raiz do projeto como diretório de origem.
2. Mantenha o preset **Other**, o comando de build `npm run build` e a saída `public`, já definidos em `vercel.json`.
3. Publique. O build copia os arquivos de GSAP para `public/vendor/`. Não conecte um banco nem configure `DATABASE_URL` para esta demo estática.

Se você já criou um projeto Vercel com `DATABASE_URL`, remova essa variável da versão pública depois de confirmar que o novo deploy está servindo apenas a pasta `public/`. Confira que `/api/tickets` responde 404. A URL fictícia de `.env.example` é apenas um modelo para o servidor de desenvolvimento, sem uso nesta publicação.

## Limites da demonstração

Este projeto é para uso **demonstrativo**. Não tem contas, autenticação, permissões reais, envio de e-mail nem anexos. Os chamados e notas ficam no armazenamento local do navegador, que pode ser apagado pelo próprio navegador. Não insira dados pessoais, confidenciais ou de clientes. Para uso real, crie outro projeto e implemente autenticação, permissões e persistência adequadas.

![Nexo Desk em inglês, tema claro e largura de celular](docs/preview-mobile.png)
