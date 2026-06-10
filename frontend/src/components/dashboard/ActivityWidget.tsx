'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { api } from '@/lib/api';

function ActivitySkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton h-6 rounded" />
      ))}
    </div>
  );
}

export function ActivityWidget() {
  const { data: activity = [], isLoading } = useQuery({
    queryKey: ['activity'],
    queryFn: () => api.activity.list(),
  });

  return (
    <div className="glass-panel p-5">
      <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-pink-400" /> Activité récente
      </h3>
      {isLoading ? (
        <ActivitySkeleton />
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {activity.length === 0 && (
            <p className="text-xs text-[var(--text-muted)]">Aucune activité récente.</p>
          )}
          {activity.map((a) => (
            <div key={a.id} className="flex gap-2 text-xs">
              <span className="text-[var(--text-dimmed)] shrink-0">
                {new Date(a.date).toLocaleDateString('fr-FR')}
              </span>
              <span className="text-[var(--text-secondary)]">{a.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
