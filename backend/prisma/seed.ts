import '../src/load-env';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const STAGES = [
  { name: 'Idée', color: '#888780', position: 1 },
  { name: 'Contacté', color: '#378ADD', position: 2 },
  { name: 'En discussion', color: '#BA7517', position: 3 },
  { name: 'Confirmé', color: '#1D9E75', position: 4 },
  { name: 'Enregistré', color: '#7F77DD', position: 5 },
  { name: 'Publié', color: '#639922', position: 6 },
];

async function main() {
  for (const stage of STAGES) {
    await prisma.pipelineStage.upsert({
      where: { position: stage.position },
      create: stage,
      update: { name: stage.name, color: stage.color },
    });
  }

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@elmaakoul.ma';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        fullname: 'Admin El Maakoul',
        email,
        passwordHash: await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!', 12),
        role: 'admin',
      },
    });
    console.log(`Admin created: ${email}`);
  }

  const stageConfirme = await prisma.pipelineStage.findFirst({ where: { position: 4 } });
  if (stageConfirme) {
    const demo = await prisma.guest.findFirst({
      where: { legacyId: 'demo-tarik' },
    });
    if (!demo) {
      const guest = await prisma.guest.create({
        data: {
          legacyId: 'demo-tarik',
          firstName: 'Tarik',
          lastName: 'Lallouch',
          company: 'Akenoo / Sindiprint / Woolpi',
          sector: 'Industrie / Impression / IA',
          city: 'Casablanca',
          source: 'CJD Maroc',
          stageId: stageConfirme.id,
          language: 'mixte',
          whyElmaakoul:
            'Fondateur multi-entreprises, président GMI Maroc, pivot vers IA.',
          emotionalAngle:
            "Transmission père-fils : grandi dans l'imprimerie du père à Meknès.",
          notes: 'Alerte orateur public — utiliser l\'angle père/origine très tôt.',
          interactions: {
            create: [
              { note: 'Premier contact via CJD. Enthousiaste.' },
              { note: 'Accord confirmé pour le pilote.' },
            ],
          },
          episode: {
            create: {
              episodeNumber: 1,
              listens: 0,
              views: 0,
            },
          },
        },
      });
      console.log(`Demo guest created: ${guest.id}`);
    }
  }

  console.log('Seed completed.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
