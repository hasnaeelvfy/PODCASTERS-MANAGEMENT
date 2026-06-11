export function sponsorDeleteMessage(name: string): string {
  return `Êtes-vous sûr de vouloir supprimer le sponsor ${name} ? Cette action supprimera également tous ses contrats associés et retirera ses badges des épisodes.`;
}

export function contractDeleteMessage(): string {
  return 'Êtes-vous sûr de vouloir supprimer ce contrat ? La description YouTube des épisodes concernés sera restaurée automatiquement.';
}
