'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccordionProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Accordion({ title, subtitle, defaultOpen = false, children, className }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('border border-[var(--border-subtle)] rounded-xl overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 min-h-[48px] text-left bg-[var(--bg-hover)]/40 hover:bg-[var(--bg-hover)]/70 transition-colors"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
          {subtitle && <div className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</div>}
        </div>
        <ChevronDown
          className={cn('w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      {open && <div className="p-4 border-t border-[var(--border-subtle)]">{children}</div>}
    </div>
  );
}
