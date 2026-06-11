/** Relations épisode → sponsors / contrats (exclut soft-deletes). */
export const episodeSponsorRelationsInclude = {
  sponsors: { where: { deletedAt: null } },
  contractEpisodes: {
    where: {
      contract: {
        deletedAt: null,
        contractStatus: 'active',
        sponsor: { deletedAt: null },
      },
    },
    include: {
      contract: {
        include: { sponsor: true },
      },
    },
  },
} as const;

/** Variante fiche détail : tous les statuts de contrat, mais sponsor/contrat non supprimés. */
export const episodeSponsorRelationsIncludeAllContracts = {
  sponsors: { where: { deletedAt: null } },
  contractEpisodes: {
    where: {
      contract: {
        deletedAt: null,
        sponsor: { deletedAt: null },
      },
    },
    include: {
      contract: {
        include: { sponsor: true },
      },
    },
  },
} as const;
