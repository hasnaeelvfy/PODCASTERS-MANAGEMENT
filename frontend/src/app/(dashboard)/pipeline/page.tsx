'use client';

import { motion } from 'framer-motion';
import { TopBar } from '@/components/layout/TopBar';
import { PipelineBoard } from '@/components/pipeline/PipelineBoard';

export default function PipelinePage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <TopBar title="Pipeline" subtitle="Gestion des invités" showNewGuest />
      <PipelineBoard />
    </motion.div>
  );
}
