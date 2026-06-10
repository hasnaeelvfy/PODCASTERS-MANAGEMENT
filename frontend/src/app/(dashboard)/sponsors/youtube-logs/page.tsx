'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function YoutubeLogsPage() {
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['youtube-logs'],
    queryFn: () => api.sponsorContracts.youtubeLogs({ limit: 50 }),
  });

  const rollback = useMutation({
    mutationFn: (videoId: string) => api.sponsorContracts.rollback(videoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['youtube-logs'] });
      toast.success('Description restaurée');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const logs = data?.data ?? [];

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden">
      <TopBar title="Logs YouTube" showSearch={false} />
      <Link href="/sponsors" className="inline-flex items-center gap-1.5 text-sm text-violet-400 mb-4 min-h-[44px]">
        <ArrowLeft className="w-4 h-4" /> Retour
      </Link>

      <div className="glass-panel overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-[var(--text-muted)]">Chargement...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)]">Aucun log.</div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {logs.map((log) => (
              <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={log.success ? 'text-emerald-400' : 'text-red-400'}>
                      {log.success ? '✅' : '❌'}
                    </span>
                    <span className="text-sm font-medium">{log.action}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {new Date(log.createdAt).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] truncate">Vidéo : {log.youtubeVideoId}</p>
                  {log.contract?.sponsor?.name && (
                    <p className="text-xs text-[var(--text-dimmed)]">{log.contract.sponsor.name}</p>
                  )}
                  {log.errorMessage && (
                    <p className="text-[10px] text-red-400 mt-1 line-clamp-2">{log.errorMessage}</p>
                  )}
                </div>
                {log.action === 'description_updated' && log.success && (
                  <button
                    type="button"
                    className="btn-ghost text-xs shrink-0 flex items-center gap-1"
                    onClick={() => {
                      if (confirm('Restaurer la description originale sur YouTube ?')) {
                        rollback.mutate(log.youtubeVideoId);
                      }
                    }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Rollback
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
