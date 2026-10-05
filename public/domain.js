export const STATUSES = ['open', 'progress', 'waiting', 'resolved', 'closed'];
export const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
export const CATEGORIES = ['access', 'software', 'hardware', 'network', 'other'];
export const isDone = ticket => ['resolved', 'closed'].includes(ticket.status);
export function deadline(ticket, now = Date.now()) {
  if (isDone(ticket)) return 'completed';
  const hours = (Date.parse(ticket.dueAt) - now) / 3600000;
  return hours < 0 ? 'overdue' : hours <= 24 ? 'soon' : 'onTime';
}
export function validateTicket(input, assignees) {
  const errors = {};
  for (const [field, min, max] of [['title', 5, 140], ['description', 10, 5000], ['requester', 2, 100]]) {
    if (typeof input[field] !== 'string' || input[field].trim().length < min || input[field].trim().length > max) errors[field] = field + 'Invalid';
  }
  if (typeof input.email !== 'string' || input.email.length > 180 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.email = 'emailInvalid';
  if (!STATUSES.includes(input.status)) errors.status = 'choiceInvalid';
  if (!PRIORITIES.includes(input.priority)) errors.priority = 'choiceInvalid';
  if (!CATEGORIES.includes(input.category)) errors.category = 'choiceInvalid';
  if (!Number.isInteger(input.assigneeId) || !assignees.some(a => a.id === input.assigneeId)) errors.assigneeId = 'choiceInvalid';
  if (typeof input.dueAt !== 'string' || !Number.isFinite(Date.parse(input.dueAt)) || !/^\d{4}-\d\d-\d\dT/.test(input.dueAt) || Date.parse(input.dueAt) > Date.parse('2100-01-01')) errors.dueAt = 'dateInvalid';
  if (!Array.isArray(input.tags) || input.tags.length > 5 || input.tags.some(t => typeof t !== 'string' || !t.trim() || t.length > 24)) errors.tags = 'tagsInvalid';
  return errors;
}
