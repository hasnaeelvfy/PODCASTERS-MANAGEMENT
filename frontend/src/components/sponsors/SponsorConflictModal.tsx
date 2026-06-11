'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';
import { GlowButton } from '@/components/ui/GlowButton';
import { CONTRACT_STATUS_LABELS, CONTRACT_TYPE_LABELS } from '@/lib/sponsor-utils';
import type { SponsorConflictDetails } from '@/types';

interface SponsorConflictModalProps {
  open: boolean;
  onClose: () => void;
  conflict: SponsorConflictDetails | null;
}

function formatPeriod(start: string | null, end: string | null): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR');
  if (start && end) return `du ${fmt(start)} au ${fmt(end)}`;
  if (start) return `à partir du ${fmt(start)}`;
  if (end) return `jusqu'au ${fmt(end)}`;
  return 'période indéfinie';
}

function episodeLabel(ep: SponsorConflictDetails['episodes'][0]): string {
  const num = ep.episodeNumber != null ? `#${ep.episodeNumber}` : `#${ep.id}`;
  const title = ep.title || ep.guestName || 'Épisode';
  return `${num} — ${title}`;
}

export function SponsorConflictModal({ open, onClose, conflict }: SponsorConflictModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!conflict || !mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80]"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="glass-panel w-full sm:max-w-md pointer-events-auto p-5 sm:p-6 rounded-2xl border border-amber-400/30 shadow-xl shadow-amber-900/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 border border-amber-400/30">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[var(--text-primary)]">
                      Conflit de sponsoring
                    </h2>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Impossible d&apos;enregistrer ce sponsor tel quel
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ghost p-2 shrink-0"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                Un ou plusieurs épisodes que vous avez sélectionnés sont déjà couverts par un
                contrat actif sur la même période. Un seul sponsor peut être actif par épisode
                à la fois.
              </p>

              <div className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.03] p-4 space-y-3 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-dimmed)] mb-1">
                    Contrat existant
                  </p>
                  <p className="text-sm font-semibold text-violet-300">{conflict.sponsorName}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    {CONTRACT_TYPE_LABELS[conflict.contractType] || conflict.contractType}
                    {' · '}
                    {CONTRACT_STATUS_LABELS[conflict.contractStatus] || conflict.contractStatus}
                  </p>
                  <p className="text-[11px] text-[var(--text-dimmed)] mt-1">
                    {formatPeriod(conflict.startDate, conflict.endDate)}
                  </p>
                </div>

                {conflict.episodes.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-dimmed)] mb-2">
                      Épisode{conflict.episodes.length > 1 ? 's' : ''} en conflit
                    </p>
                    <ul className="space-y-1.5">
                      {conflict.episodes.map((ep) => (
                        <li
                          key={ep.id}
                          className="text-sm text-[var(--text-primary)] flex items-center gap-2 before:content-['•'] before:text-amber-400"
                        >
                          {episodeLabel(ep)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-[var(--text-muted)] mb-4">
                Modifiez les épisodes sélectionnés, ajustez les dates du contrat, ou mettez en
                pause / annulez le contrat existant avant de réessayer.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <GlowButton variant="ghost" className="flex-1" onClick={onClose}>
                  Modifier ma sélection
                </GlowButton>
                <Link
                  href={`/sponsors/${conflict.sponsorId}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 btn-primary min-h-[40px] text-sm rounded-xl"
                  onClick={onClose}
                >
                  Voir le sponsor
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
