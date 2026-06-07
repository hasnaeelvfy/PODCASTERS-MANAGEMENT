'use client';

import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlowCard({ children, className, hover = false }: GlowCardProps) {
  return (
    <div className={cn('card', hover && 'card-hover', className)}>
      {children}
    </div>
  );
}
