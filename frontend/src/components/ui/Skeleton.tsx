import { cn } from '@/lib/utils';
import type { CSSProperties } from 'react';

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn('skeleton', className)} style={style} />;
}

export function KpiCardSkeleton() {
  return (
    <div className="glass-panel p-5 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-[var(--border-subtle)]">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-24 flex-1" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return <Skeleton className="w-full rounded-xl" style={{ height }} />;
}
