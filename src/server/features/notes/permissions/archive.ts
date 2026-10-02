export const changesArchivedAt = (
  entity: { archivedAt?: string | null },
  existing: { archivedAt?: string | null }
): boolean => entity.archivedAt !== undefined && (entity.archivedAt ?? null) !== (existing.archivedAt ?? null);
