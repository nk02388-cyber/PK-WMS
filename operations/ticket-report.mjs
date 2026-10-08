const bangkokDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit'
});

export function bangkokDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = Object.fromEntries(bangkokDateFormatter.formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function filterTickets(tickets, filters) {
  const query = (filters.query || '').trim().toLocaleLowerCase();
  const from = filters.dateFrom || '';
  const to = filters.dateTo || '';
  if (from && to && from > to) return [];
  return tickets.filter(ticket => {
    const basis=['created_at','started_at','ended_at'].includes(filters.dateBasis)?filters.dateBasis:'created_at';
    const date = bangkokDate(ticket[basis]);
    const picks=pickCompleteness(ticket);
    const completeness=filters.completeness||'all';
    return (!query || query.normalize('NFKC').split(/\s+/).every(term => [ticket.ticket_no,ticket.search_text,ticket.fg_code,ticket.fg_name,ticket.note,ticket.notes,...(ticket.materials||[]).map(m=>[m.pk_code,m.pk_name,m.name,m.document_no,m.lot_no].join(' '))].join(' ').normalize('NFKC').toLocaleLowerCase().includes(term)))
      && (!filters.assigneeId || ticket.assignee_id === filters.assigneeId)
      && (!filters.jobId || ticket.job_type_id === filters.jobId)
      && (!filters.status || ticket.status === filters.status)
      && (completeness==='all'||completeness==='complete'&&picks.complete||completeness==='incomplete'&&picks.total>0&&!picks.complete||completeness==='variance'&&(ticket.materials||[]).some(l=>l.confirmed_at&&Math.abs(Math.round((l.actual_qty-Number(l.required_qty))*10000))>10000))
      && (!(from||to)||!!date)
      && (!from || date >= from)
      && (!to || date <= to);
  });
}
import {pickCompleteness} from './operations.mjs?v=4';
