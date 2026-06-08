'use client';

import { cn } from '@/lib/utils';

interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
  glow?: boolean;
}

export function GlowCard({
  children,
  className,
  hover = false,
  gradient = false,
  glow = false,
  ...props
}: GlowCardProps) {
  return (
    <div
      className={cn(
        'card',
        hover && 'card-hover',
        gradient && 'bg-gradient-to-br from-white/5 to-white/[0.02]',
        glow && 'shadow-[0_0_40px_rgba(139,92,246,0.15)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
