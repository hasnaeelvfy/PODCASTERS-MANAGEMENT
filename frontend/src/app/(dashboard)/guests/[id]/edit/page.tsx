'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { GlowCard } from '@/components/ui/GlowCard';
import { GuestForm } from '@/components/guests/GuestForm';
import { api } from '@/lib/api';

export default function EditGuestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const guestId = Number(id);
  const router = useRouter();

  const { data: guest, isLoading } = useQuery({
    queryKey: ['guest', guestId],
    queryFn: () => api.guests.get(guestId),
  });

  const { data: stages = [] } = useQuery({
    queryKey: ['stages'],
    queryFn: () => api.guests.stages(),
  });

  const update = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.guests.update(guestId, data),
    onSuccess: () => router.push(`/guests/${guestId}`),
  });

  if (isLoading || !guest) return <div className="text-white/40">Chargement...</div>;

  return (
    <div>
      <Link
        href={`/guests/${guestId}`}
        className="inline-flex items-center gap-1 text-sm text-brand-yellow mb-6 font-medium hover:text-brand-blue transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Annuler
      </Link>
      <GlowCard gradient>
        <h1 className="text-lg font-bold mb-6">
          Modifier · {guest.firstName} {guest.lastName}
        </h1>
        <GuestForm
          guest={guest}
          stages={stages}
          onSubmit={(data) => update.mutate(data)}
          onCancel={() => router.push(`/guests/${guestId}`)}
          loading={update.isPending}
        />
      </GlowCard>
    </div>
  );
}
