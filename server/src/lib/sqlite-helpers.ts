/**
 * sqlite-helpers.ts
 * SQLite stores arrays as JSON strings. These helpers handle serialization
 * and deserialization transparently so the rest of the codebase can use
 * plain JS arrays.
 */

export const toJsonArray = (arr: string[] | undefined | null): string => {
  if (!arr) return '[]';
  return JSON.stringify(arr);
};

export const fromJsonArray = (jsonStr: string | undefined | null): string[] => {
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Deserialize images and tags fields in a Listing object returned from Prisma.
 * Call this on every listing before returning it to clients.
 */
export const deserializeListing = <T extends { images: string; tags: string }>(
  listing: T
): Omit<T, 'images' | 'tags'> & { images: string[]; tags: string[] } => ({
  ...listing,
  images: fromJsonArray(listing.images),
  tags: fromJsonArray(listing.tags),
});
