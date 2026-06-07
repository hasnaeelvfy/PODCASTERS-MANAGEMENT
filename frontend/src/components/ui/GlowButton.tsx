'use client';

import { cn } from '@/lib/utils';

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function GlowButton({
  children,
  className,
  variant = 'primary',
  ...props
}: GlowButtonProps) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
  };

  return (
    <button className={cn(variants[variant], className)} {...props}>
      {children}
    </button>
  );
}
