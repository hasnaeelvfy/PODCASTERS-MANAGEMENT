'use client';

import { DollarSign } from 'lucide-react';
import { GlowCard } from '@/components/ui/GlowCard';
import { formatNumber } from '@/lib/utils';

export function TopSponsors({
  sponsors,
}: {
  sponsors: { name: string; total: number; count: number }[];
}) {
  return (
    <GlowCard>
      <h3 className="section-title mb-1">Top sponsors</h3>
      <p className="section-subtitle mb-5">Revenus par partenaire</p>
      <div className="space-y-2">
        {sponsors.length === 0 && (
          <div className="empty-state py-10">
            <div className="empty-state-icon">
              <DollarSign className="w-6 h-6 text-cyan-400" />
            </div>
            <p className="text-sm text-[var(--text-muted)]">Aucun sponsor enregistré</p>
          </div>
        )}
        {sponsors.map((sp, i) => (
          <div
            key={sp.name}
            className="flex items-center gap-3 p-3 rounded-[10px] hover:bg-[var(--bg-hover)] transition-all duration-200"
          >
            <span
              className={`text-sm font-bold w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 ${
                i === 0 ? 'bg-gradient-to-br from-cyan-500/30 to-cyan-600/10 text-cyan-300 border border-cyan-400/20' : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
              }`}
            >
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--text-primary)] font-semibold truncate">{sp.name}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sp.count} deal(s)</p>
            </div>
            <span className="text-sm font-bold text-cyan-300 tabular-nums shrink-0">
              {formatNumber(sp.total)} MAD
            </span>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
