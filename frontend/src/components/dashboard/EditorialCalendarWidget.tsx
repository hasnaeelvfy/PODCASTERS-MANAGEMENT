'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { formatEditorialDate } from '@/lib/utils';

function CalendarSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-12 rounded-lg" />
      ))}
    </div>
  );
}

export function EditorialCalendarWidget() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['editorial-calendar'],
    queryFn: () => api.dashboard.editorialCalendar(),
  });

  return (
    <div className="glass-panel p-5">
      <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-violet-400" /> Calendrier éditorial
      </h3>
      {isLoading ? (
        <CalendarSkeleton />
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {events.length === 0 && (
            <p className="text-xs text-[var(--text-muted)]">Aucun événement à venir.</p>
          )}
          {events.map((ev, i) => (
            <Link
              key={`${ev.guestId}-${ev.date}-${i}`}
              href={`/guests/${ev.guestId}`}
              className="block p-2 rounded-lg border border-violet-500/10 hover:border-violet-500/30 transition-colors"
            >
              <p className="text-xs font-semibold text-violet-300">{ev.label}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{formatEditorialDate(ev.date)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
