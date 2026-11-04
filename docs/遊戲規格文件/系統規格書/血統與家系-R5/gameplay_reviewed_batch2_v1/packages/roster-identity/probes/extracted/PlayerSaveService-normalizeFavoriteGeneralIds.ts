export function normalizeFavoriteGeneralIds(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    for (const id of value) {
        if (typeof id === 'string' && id.length > 0) seen.add(id);
    }
    return Array.from(seen);
}
