'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { GlowCard } from '@/components/ui/GlowCard';
import { GuestForm } from '@/components/guests/GuestForm';
import { api } from '@/lib/api';

function NewGuestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stageParam = searchParams.get('stage');

  const { data: stages = [] } = useQuery({
    queryKey: ['stages'],
    queryFn: () => api.guests.stages(),
  });

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.guests.create(data),
    onSuccess: (guest) => router.push(`/guests/${guest.id}`),
  });

  const defaultStage = stageParam ? Number(stageParam) : stages[0]?.id;

  return (
    <div>
      <Link
        href="/pipeline"
        className="inline-flex items-center gap-1 text-sm text-brand-yellow mb-6 font-medium hover:text-brand-blue transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Retour
      </Link>
      <GlowCard gradient>
        <h1 className="text-lg font-bold mb-6">Nouvel invité potentiel</h1>
        {stages.length > 0 && (
          <GuestForm
            guest={{ stageId: defaultStage }}
            stages={stages}
            onSubmit={(data) => create.mutate(data)}
            onCancel={() => router.push('/pipeline')}
            loading={create.isPending}
          />
        )}
      </GlowCard>
    </div>
  );
}

export default function NewGuestPage() {
  return (
    <Suspense fallback={<div className="text-white/40">Chargement...</div>}>
      <NewGuestForm />
    </Suspense>
  );
}
