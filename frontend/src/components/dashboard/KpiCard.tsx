'use client';

import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  accent?: 'purple' | 'green' | 'blue' | 'pink' | 'orange';
  delay?: number;
  compact?: boolean;
}

const accentMap = {
  purple: { icon: 'text-violet-400 bg-violet-500/10', glow: 'kpi-glow-purple' },
  green: { icon: 'text-emerald-400 bg-emerald-500/10', glow: 'kpi-glow-green' },
  blue: { icon: 'text-blue-400 bg-blue-500/10', glow: 'kpi-glow-blue' },
  pink: { icon: 'text-pink-400 bg-pink-500/10', glow: 'kpi-glow-pink' },
  orange: { icon: 'text-amber-400 bg-amber-500/10', glow: 'kpi-glow-orange' },
};

export function KpiCard({ label, value, change, icon: Icon, accent = 'purple', delay = 0, compact = false }: KpiCardProps) {
  const styles = accentMap[accent];
  const isPositive = (change ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={cn('glass-panel card-hover', compact ? 'p-3.5' : 'p-5', styles.glow)}
    >
      <div className={cn('flex items-start justify-between', compact ? 'mb-2' : 'mb-3')}>
        <p className={cn('font-bold tracking-[0.1em] uppercase text-[var(--text-muted)] leading-tight', compact ? 'text-[9px]' : 'text-[10px]')}>
          {label}
        </p>
        <div className={cn('rounded-lg flex items-center justify-center shrink-0', compact ? 'w-7 h-7' : 'w-8 h-8', styles.icon)}>
          <Icon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </div>
      </div>
      <p className={cn('font-bold tracking-tight text-[var(--text-primary)] font-mono tabular-nums', compact ? 'text-lg' : 'text-2xl md:text-3xl')}>
        {value}
      </p>
      {!compact && change !== undefined && change !== 0 && (
        <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', isPositive ? 'text-emerald-400' : 'text-red-400')}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{isPositive ? '+' : ''}{change}% vs mois préc.</span>
        </div>
      )}
      {compact && change !== undefined && change !== 0 && (
        <p className={cn('text-[10px] font-medium mt-1', isPositive ? 'text-emerald-400' : 'text-red-400')}>
          {isPositive ? '+' : ''}{change}%
        </p>
      )}
    </motion.div>
  );
}
