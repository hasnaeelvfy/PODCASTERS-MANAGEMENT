'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  accent?: 'gold' | 'green' | 'blue' | 'none';
  className?: string;
}

const accentClasses = {
  gold: 'card-accent-gold',
  green: 'card-accent-green',
  blue: 'card-accent-blue',
  none: '',
};

const iconStyles = {
  gold: { bg: 'bg-gold/10', color: 'text-gold' },
  green: { bg: 'bg-success/10', color: 'text-success' },
  blue: { bg: 'bg-blue/10', color: 'text-blue' },
  none: { bg: 'bg-white/5', color: 'text-[var(--text-muted)]' },
};

export function StatCard({ label, value, icon: Icon, trend, accent = 'gold', className }: StatCardProps) {
  const accentClass = accentClasses[accent];
  const iconStyle = iconStyles[accent];

  const accentColor = accent === 'gold' ? '#8B5CF6' : accent === 'green' ? '#10B981' : '#06B6D4';
  const accentBg = accent === 'gold' ? 'rgba(139, 92, 246, 0.1)' : accent === 'green' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(6, 182, 212, 0.1)';

  return (
    <div className={cn(
      'card card-hover p-4 md:p-6 flex flex-col gap-3 relative overflow-hidden',
      className
    )} style={{ borderTopColor: accentColor }}>
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
      
      <div className="relative z-10 flex items-start justify-between gap-2">
        <span className="stat-label">{label}</span>
        <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: accentBg }}>
          <Icon className="w-4 h-4" style={{ color: accentColor }} />
        </div>
      </div>
      <p className="stat-number text-3xl md:text-4xl">{typeof value === 'number' ? formatNumber(value) : value}</p>
      {trend !== undefined && (
        <p className={cn('text-[11px] font-600 tracking-wide',
          trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-[var(--text-muted)]'
        )}>
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}% ce mois
        </p>
      )}
    </div>
  )
}
