/** Generate a stable id (browser + Node). */
export function createId(prefix?: string): string {
  let uuid: string;
  try {
    const cryptoObj = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    uuid =
      cryptoObj && typeof cryptoObj.randomUUID === 'function'
        ? cryptoObj.randomUUID()
        : fallbackId();
  } catch {
    uuid = fallbackId();
  }
  return prefix ? `${prefix}_${uuid}` : uuid;
}

function fallbackId(): string {
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
