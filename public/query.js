import { CATEGORIES, PRIORITIES, deadline, isDone } from './domain.js';

export function listTickets(tickets, query = {}) {
  const q = String(query.q || '').toLocaleLowerCase().trim();
  const result = tickets.filter(ticket => {
    if (q && !`${ticket.id} NEX-${ticket.id} NEX-${String(ticket.id).padStart(3, '0')} ${ticket.title} ${ticket.description} ${ticket.requester} ${ticket.email} ${ticket.tags.join(' ')}`.toLocaleLowerCase().includes(q)) return false;
    if (['status', 'priority', 'category'].some(key => query[key] && query[key] !== ticket[key])) return false;
    if (query.assigneeId && Number(query.assigneeId) !== ticket.assigneeId) return false;
    if (query.deadline && deadline(ticket) !== query.deadline) return false;
    if (query.queue === 'mine' && (ticket.assigneeId !== 1 || isDone(ticket))) return false;
    if (query.queue === 'urgent' && (ticket.priority !== 'urgent' || isDone(ticket))) return false;
    if (query.queue === 'soon' && deadline(ticket) !== 'soon') return false;
    if (query.queue === 'overdue' && deadline(ticket) !== 'overdue') return false;
    if (query.queue === 'resolved' && !isDone(ticket)) return false;
    return true;
  });

  const sort = query.sort || 'priority';
  result.sort((a, b) => sort === 'oldest' ? a.id - b.id : sort === 'newest' ? b.id - a.id : sort === 'deadline' ? a.dueAt.localeCompare(b.dueAt) : PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority) || a.dueAt.localeCompare(b.dueAt));
  return result;
}

export function summarizeTickets(tickets, period = 7) {
  const days = [7, 30, 90].includes(Number(period)) ? Number(period) : 7;
  const now = Date.now();
  const from = now - days * 86400000;
  const active = tickets.filter(ticket => !isDone(ticket));
  const resolved = tickets.filter(ticket => isDone(ticket) && ticket.resolvedAt && Date.parse(ticket.resolvedAt) >= from);
  const trend = Array.from({ length: days }, (_, index) => {
    const date = new Date(now - (days - index - 1) * 86400000).toISOString().slice(0, 10);
    return {
      date,
      created: tickets.filter(ticket => ticket.createdAt.startsWith(date)).length,
      resolved: tickets.filter(ticket => ticket.resolvedAt?.startsWith(date)).length,
    };
  });

  return {
    days,
    total: tickets.length,
    open: tickets.filter(ticket => ticket.status === 'open').length,
    progress: tickets.filter(ticket => ticket.status === 'progress').length,
    overdue: active.filter(ticket => deadline(ticket) === 'overdue').length,
    resolved: resolved.length,
    priorities: PRIORITIES.map(key => ({ key, count: active.filter(ticket => ticket.priority === key).length })),
    categories: CATEGORIES.map(key => ({ key, count: active.filter(ticket => ticket.category === key).length })),
    trend,
    queues: Object.fromEntries(['all', 'mine', 'urgent', 'soon', 'overdue', 'resolved'].map(key => [key, listTickets(tickets, { queue: key }).length])),
    alerts: active.filter(ticket => ticket.priority === 'urgent' || ['soon', 'overdue'].includes(deadline(ticket))).sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
  };
}
