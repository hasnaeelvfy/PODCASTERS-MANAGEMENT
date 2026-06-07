'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Guest } from '@/types';
import { initials, formatDateTime, LANGUAGE_LABELS, calcReach } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

export function GuestCard({ guest }: { guest: Guest }) {
  const stage = guest.stage;
  const reach = guest.stage?.position === 6 ? calcReach(guest.episode || undefined) : 0;

  return (
    <Link href={`/guests/${guest.id}`} className="block group">
      <div className="card card-hover p-3 md:p-4 transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-violet-400/20 to-pink-400/10 text-[11px] font-bold text-cyan-300 flex items-center justify-center border border-[var(--border-subtle)] shrink-0 group-hover:border-cyan-400/40 transition-colors">
            {initials(guest.firstName, guest.lastName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-[var(--text-primary)] leading-tight truncate">
              {guest.firstName} {guest.lastName}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1 truncate">{guest.company}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          {guest.language && guest.language !== 'adefini' ? (
            <span className="badge badge-blue text-[9px]">{LANGUAGE_LABELS[guest.language]}</span>
          ) : <span />}
          {guest.shootingDate && (
            <p className="text-[9px] text-[var(--text-muted)] font-medium shrink-0">
              {formatDateTime(guest.shootingDate)}
            </p>
          )}
        </div>
        {reach > 0 && (
          <p className="text-[10px] text-cyan-400 font-bold mt-2">
            📊 {reach.toLocaleString('fr')} portée
          </p>
        )}
      </div>
    </Link>
  )
}
