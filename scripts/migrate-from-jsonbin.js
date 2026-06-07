/**
 * Migration JSONBin / localStorage → MySQL via Prisma
 * Usage: node scripts/migrate-from-jsonbin.js path/to/export.json
 */
const fs = require('fs');
const path = require('path');

const STAGE_MAP = {
  idee: 1,
  contacte: 2,
  discussion: 3,
  confirme: 4,
  enregistre: 5,
  publie: 6,
};

const LANG_MAP = {
  mixte: 'mixte',
  francais: 'francais',
  darija: 'darija',
  adefini: 'adefini',
};

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/migrate-from-jsonbin.js export.json');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  const guests = raw.guests || raw;
  if (!Array.isArray(guests)) {
    console.error('Invalid format: expected { guests: [] }');
    process.exit(1);
  }

  // Dynamic import Prisma from backend
  process.chdir(path.join(__dirname, '..', 'backend'));
  require('dotenv').config();
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  let migrated = 0;
  let skipped = 0;

  for (const g of guests) {
    const legacyId = g.id;
    if (!legacyId) continue;

    const exists = await prisma.guest.findFirst({ where: { legacyId } });
    if (exists) {
      skipped++;
      continue;
    }

    const stageId = STAGE_MAP[g.stade] || 1;
    const ep = g.episode || {};

    await prisma.guest.create({
      data: {
        legacyId,
        firstName: g.prenom || '',
        lastName: g.nom || '',
        company: g.entreprise || null,
        sector: g.secteur || null,
        city: g.ville || null,
        source: g.source || null,
        contact: g.contact || null,
        language: LANG_MAP[g.langue] || 'adefini',
        stageId,
        shootingDate: g.dateTournage ? new Date(g.dateTournage) : null,
        whyElmaakoul: g.pourquoi || null,
        emotionalAngle: g.angleEmotionnel || null,
        notes: g.notes || null,
        createdAt: g.dateAjout ? new Date(g.dateAjout) : undefined,
        interactions: {
          create: (g.interactions || []).map((i) => ({
            note: i.note,
            createdAt: i.date ? new Date(i.date) : new Date(),
          })),
        },
        episode: {
          create: {
            episodeNumber: ep.numero || null,
            title: ep.titre || null,
            recordingDate: ep.dateEnregistrement ? new Date(ep.dateEnregistrement) : null,
            publicationDate: ep.datePublication ? new Date(ep.datePublication) : null,
            spotifyLink: ep.spotifyLink || null,
            youtubeLink: ep.youtubeLink || null,
            listens: ep.ecoutes || 0,
            views: ep.vues || 0,
            shares: ep.partages || 0,
            completionRate: ep.completion != null ? ep.completion : null,
            shorts: {
              create: (ep.shorts || []).map((s) => ({
                platform: s.platform || 'yt_shorts',
                title: s.titre || null,
                views: s.views || 0,
                likes: s.likes || 0,
                shares: s.partages || 0,
                url: s.lien || null,
              })),
            },
            sponsors: {
              create: (ep.sponsors || []).map((sp) => ({
                name: sp.nom || '',
                sponsorType: sp.type || 'mention',
                amount: sp.montant || 0,
                status: sp.statut || 'prospect',
                notes: sp.notes || null,
              })),
            },
          },
        },
      },
    });
    migrated++;
    console.log(`Migrated: ${g.prenom} ${g.nom} (${legacyId})`);
  }

  console.log(`\nDone. Migrated: ${migrated}, Skipped: ${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
