'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Guest } from '@/types';
import { cn, initials, formatDateTime, LANGUAGE_LABELS } from '@/lib/utils';

export function GuestCard({ guest, compact = false }: { guest: Guest; compact?: boolean }) {
  const stage = guest.stage;

  return (
    <Link href={`/guests/${guest.id}`} className="block group">
      <div className={cn('card card-hover transition-all duration-300 active:scale-[0.99]', compact ? 'p-3' : 'p-3 md:p-4')}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-[var(--text-primary)] leading-tight truncate">
              {guest.firstName} {guest.lastName}
            </p>
            {guest.company && (
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{guest.company}</p>
            )}
          </div>
          {stage && (
            <span
              className="badge text-[8px] shrink-0 max-w-[40%] truncate"
              style={{ backgroundColor: `${stage.color}18`, color: stage.color, borderColor: `${stage.color}40` }}
            >
              {stage.name}
            </span>
          )}
        </div>
        {!compact && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-violet-400/20 to-pink-400/10 text-[10px] font-bold text-cyan-300 flex items-center justify-center border border-[var(--border-subtle)] shrink-0">
              {initials(guest.firstName, guest.lastName)}
            </div>
            <div className="min-w-0 flex-1">
              {guest.language && guest.language !== 'adefini' && (
                <span className="badge badge-blue text-[9px]">{LANGUAGE_LABELS[guest.language]}</span>
              )}
            </div>
          </div>
        )}
        {guest.shootingDate && (
          <p className="mt-2 text-[10px] text-[var(--text-muted)]">{formatDateTime(guest.shootingDate)}</p>
        )}
      </div>
    </Link>
  );
}
