'use client';

import { GlowCard } from '@/components/ui/GlowCard';

export function PipelineChart({
  data,
}: {
  data: { name: string; color: string; count: number }[];
}) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;

  return (
    <GlowCard>
      <h3 className="section-title mb-1">Conversion pipeline</h3>
      <p className="section-subtitle mb-5">Répartition par stade</p>
      <div className="space-y-4">
        {data.map((item) => {
          const pct = Math.round((item.count / total) * 100);
          return (
            <div key={item.name} className="group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-[var(--text-muted)] font-semibold">{item.name}</span>
                <span className="text-[12px] font-bold text-[var(--text-primary)] tabular-nums">
                  {item.count}{' '}
                  <span className="text-[var(--text-muted)] font-normal">({pct}%)</span>
                </span>
              </div>
              <div className="h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out group-hover:opacity-90"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: item.color,
                    boxShadow: `0 0 16px ${item.color}66`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </GlowCard>
  );
}
