export const CACHE_KEYS = {
  TRANSFER: (idempotencyKey: string) => `transfer:${idempotencyKey}`,
} as const;
