'use client';

import { SearchX } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptySearchStateProps {
  query: string;
  entityLabel?: string;
}

export function EmptySearchState({ query, entityLabel = 'élément' }: EmptySearchStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4"
    >
      <div className="w-14 h-14 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-hover)] flex items-center justify-center mb-5">
        <SearchX size={24} className="text-[var(--text-muted)]" />
      </div>
      <h3 className="text-sm font-black tracking-tight uppercase text-[var(--text-primary)] mb-2">
        Aucun résultat trouvé
      </h3>
      <p className="text-sm text-[var(--text-muted)] max-w-sm leading-relaxed">
        Aucun {entityLabel} correspondant à{' '}
        <span className="text-cyan-300 font-semibold">&laquo;&nbsp;{query}&nbsp;&raquo;</span>.
        Essayez avec d&apos;autres mots-clés.
      </p>
    </motion.div>
  );
}
