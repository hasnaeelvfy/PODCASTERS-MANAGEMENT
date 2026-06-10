'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListTodo } from 'lucide-react';
import { api } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';

function TasksSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-10 rounded-lg" />
      ))}
    </div>
  );
}

export function TasksWidget() {
  const qc = useQueryClient();
  const { canEdit } = usePermissions();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.tasks.list(),
  });

  const markDone = useMutation({
    mutationFn: (id: number) => api.tasks.markDone(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return (
    <div className="glass-panel p-5">
      <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
        <ListTodo className="w-4 h-4 text-blue-400" /> Tâches en cours
      </h3>
      {isLoading ? (
        <TasksSkeleton />
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {tasks.length === 0 && (
            <p className="text-xs text-[var(--text-muted)]">Aucune tâche en cours.</p>
          )}
          {tasks.map((t) => (
            <div key={t.id} className="p-2 rounded-lg bg-white/[0.02] flex items-start gap-2">
              {canEdit && (
                <input
                  type="checkbox"
                  className="mt-1 shrink-0 w-4 h-4 accent-violet-500"
                  checked={false}
                  onChange={() => markDone.mutate(t.id)}
                  aria-label={`Marquer comme terminée : ${t.title}`}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">{t.title}</p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {t.assignee || t.guestName}
                  {t.dueDate ? ` · ${new Date(t.dueDate).toLocaleDateString('fr-FR')}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
